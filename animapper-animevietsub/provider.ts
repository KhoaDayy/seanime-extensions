/// <reference path="./onlinestream-provider.d.ts" />
/// <reference path="./core.d.ts" />

// AniMapper API base URL - can be configured
const API_BASE_URL = "https://api.animapper.net"
const PROVIDER_NAME = "ANIMEVIETSUB"

// AniMapper API response types
type AniMapperSearchResponse = {
    success: boolean
    results: Array<{
        id: number
        mediaType: string
        titles: {
            en?: string
            ja?: string
            vi?: string
        }
        images?: {
            coverXl?: string
            coverLg?: string
            coverMd?: string
        }
        status?: string
        providers?: {
            [key: string]: {
                providerMediaId: string
                similarity: number
                mappingType: string
            }
        }
    }>
    total: number
    limit: number
    offset: number
    hasNextPage: boolean
}

type AniMapperEpisodesResponse = {
    provider: string
    limit: number
    offset: number
    total: number
    hasNextPage: boolean
    episodes: Array<{
        episodeNumber: string
        episodeId: string
        server?: string
    }>
}

type AniMapperSourceResponse = {
    server: string
    type: string
    corsProxyRequired: boolean
    proxyHeaders: Record<string, string> | null
    url: string
}

class Provider {
    private apiBaseUrl: string
    private cachedServers: string[] = ["DU", "HDX"] // Default fallback servers

    constructor() {
        this.apiBaseUrl = API_BASE_URL
    }

    getSettings(): Settings {
        return {
            episodeServers: this.cachedServers,
            supportsDub: false,
        }
    }
    
    private updateServersFromEpisodes(episodes: AniMapperEpisodesResponse["episodes"]): void {
        const servers = new Set<string>()
        
        for (const episode of episodes) {
            if (episode.server) {
                servers.add(episode.server)
            }
        }
        
        if (servers.size > 0) {
            this.cachedServers = Array.from(servers).sort()
        }
    }

    async search(opts: SearchOptions): Promise<SearchResult[]> {
        try {
            if (opts.media?.id) {
                const metadataUrl = `${this.apiBaseUrl}/api/v1/metadata?id=${opts.media.id}`
                const metadataRes = await fetch(metadataUrl)
                
                if (metadataRes.ok) {
                    const metadata = await metadataRes.json() as { 
                        success: boolean
                        result?: { 
                            providers?: { [key: string]: any }
                            titles?: { en?: string; vi?: string; ja?: string }
                        } 
                    }
                    if (metadata.success && metadata.result?.providers?.[PROVIDER_NAME]) {
                        const title = metadata.result.titles?.en || metadata.result.titles?.vi || metadata.result.titles?.ja || opts.media.englishTitle || opts.media.romajiTitle || opts.query
                        return [{
                            id: opts.media.id.toString(),
                            title: title,
                            url: "",
                            subOrDub: "sub",
                        }]
                    }
                }
            }

            const searchUrl = `${this.apiBaseUrl}/api/v1/search?title=${encodeURIComponent(opts.query)}&mediaType=ANIME&limit=20&offset=0`
            const res = await fetch(searchUrl)

            if (!res.ok) {
                console.error(`AniMapper search failed: ${res.status} ${res.statusText}`)
                return []
            }

            const data = await res.json() as AniMapperSearchResponse

            if (!data.success || !data.results) {
                return []
            }

            const results: SearchResult[] = []

            for (const item of data.results) {
                if (item.providers && !item.providers[PROVIDER_NAME]) {
                    continue 
                }

                const title = item.titles.en || item.titles.vi || item.titles.ja || opts.query
                results.push({
                    id: item.id.toString(),
                    title: title,
                    url: "",
                    subOrDub: "sub",
                })
            }

            return results
        } catch (error) {
            console.error("AniMapper search error:", error)
            return []
        }
    }

    async findEpisodes(id: string): Promise<EpisodeDetails[]> {
        try {
            const mediaId = parseInt(id)
            if (isNaN(mediaId)) {
                throw new Error(`Invalid media ID: ${id}`)
            }

            let offset = 0
            const limit = 100
            const allEpisodes: EpisodeDetails[] = []

            while (true) {
                const episodesUrl = `${this.apiBaseUrl}/api/v1/stream/episodes?id=${mediaId}&provider=${PROVIDER_NAME}&limit=${limit}&offset=${offset}`
                const res = await fetch(episodesUrl)

                if (!res.ok) {
                    if (res.status === 404) {
                        const errorData = await res.json().catch(() => ({}))
                        if (errorData.code === "MAPPING_NOT_FOUND" || errorData.code === "EPISODES_NOT_FOUND") {
                            throw new Error(`No episodes found for media ID: ${mediaId}`)
                        }
                    }
                    throw new Error(`Failed to fetch episodes: ${res.status} ${res.statusText}`)
                }

                const data = await res.json() as AniMapperEpisodesResponse

                if (!data.episodes || data.episodes.length === 0) {
                    break
                }
                
                this.updateServersFromEpisodes(data.episodes)

                for (const episode of data.episodes) {
                    const episodeNumberStr = episode.episodeNumber.trim()
                    
                    const baseNumberMatch = episodeNumberStr.match(/^(\d+)/)
                    if (!baseNumberMatch) {
                        continue
                    }
                    
                    const baseNumber = parseInt(baseNumberMatch[1], 10)
                    if (isNaN(baseNumber)) {
                        continue
                    }
                    
                    const hasUnderscoreSuffix = episodeNumberStr.includes("_")
                    const hasDashRange = episodeNumberStr.includes("-") && episodeNumberStr.split("-").length > 1
                    
                    const episodeNumber = baseNumber
                    
                    const title = (hasUnderscoreSuffix || hasDashRange)
                        ? `Episode ${episodeNumberStr}` 
                        : `Episode ${episodeNumber}`
                    
                    // Ensure number is always an integer - use bitwise OR to force integer conversion
                    const episodeNumberInt = (parseInt(baseNumber.toString(), 10)) | 0
                    
                    const episodeDetail: EpisodeDetails & { episodeNumberStr?: string; server?: string } = {
                        id: episode.episodeId,
                        number: episodeNumberInt,
                        url: "",
                        title: title,
                    }
                    episodeDetail.episodeNumberStr = episodeNumberStr
                    // Store server information if available from API
                    if (episode.server) {
                        episodeDetail.server = episode.server
                    }
                    allEpisodes.push(episodeDetail)
                }

                if (!data.hasNextPage) {
                    break
                }

                offset += limit
            }

            if (allEpisodes.length === 0) {
                throw new Error("No episodes found.")
            }

            // Sort episodes by parsing the episode number string
            // This handles formats like "195", "195_1", "195_2", "195-196-197", "195_end"
            allEpisodes.sort((a, b) => {
                const aStr = (a as any).episodeNumberStr || a.number.toString()
                const bStr = (b as any).episodeNumberStr || b.number.toString()
                
                const aBaseMatch = aStr.match(/^(\d+)/)
                const bBaseMatch = bStr.match(/^(\d+)/)
                
                if (!aBaseMatch || !bBaseMatch) {
                    return aStr.localeCompare(bStr)
                }
                
                const aBase = parseInt(aBaseMatch[1])
                const bBase = parseInt(bBaseMatch[1])
                
                if (aBase !== bBase) {
                    return aBase - bBase
                }
                
                const aHasUnderscore = aStr.includes("_")
                const aHasDash = aStr.includes("-")
                const bHasUnderscore = bStr.includes("_")
                const bHasDash = bStr.includes("-")
                
                if (!aHasUnderscore && !aHasDash) return -1
                if (!bHasUnderscore && !bHasDash) return 1
                
                if (aHasUnderscore && !aHasDash) {
                    const aSuffixMatch = aStr.match(/_(\d+)/)
                    if (aSuffixMatch) {
                        if (bHasDash) return -1
                        if (bHasUnderscore && !bStr.match(/_(\d+)/)) return -1
                        if (bHasUnderscore) {
                            const bSuffixMatch = bStr.match(/_(\d+)/)
                            if (bSuffixMatch) {
                                return parseInt(aSuffixMatch[1]) - parseInt(bSuffixMatch[1])
                            }
                        }
                    }
                }
                
                if (aHasDash) {
                    if (bHasUnderscore && !bStr.match(/_(\d+)/)) return -1
                    if (bHasDash) return aStr.localeCompare(bStr)
                }
                
                if (aStr.toLowerCase().endsWith("_end")) return 1
                if (bStr.toLowerCase().endsWith("_end")) return -1
                
                if (aBase === bBase) {
                    const aServer = (a as any).server || ""
                    const bServer = (b as any).server || ""
                    if (aServer !== bServer) {
                        return aServer.localeCompare(bServer)
                    }
                }
                
                return aStr.localeCompare(bStr)
            })
            
            allEpisodes.forEach(ep => {
                delete (ep as any).episodeNumberStr
                ep.number = (ep.number | 0)
            })

            return allEpisodes
        } catch (error) {
            console.error("AniMapper findEpisodes error:", error)
            throw error
        }
    }

    async findEpisodeServer(episode: EpisodeDetails, server: string): Promise<EpisodeServer> {
        try {
            const episodeServer = (episode as any).server
            let serverName = server && server !== "default" ? server : (episodeServer || "DU")
            
            const episodeData = episode.id

            const sourceUrl = `${this.apiBaseUrl}/api/v1/stream/source?episodeData=${encodeURIComponent(episodeData)}&provider=${PROVIDER_NAME}&server=${serverName}`
            const res = await fetch(sourceUrl)

            if (!res.ok) {
                throw new Error(`Failed to fetch episode source: ${res.status} ${res.statusText}`)
            }

            const data = await res.json() as AniMapperSourceResponse

            let videoType: VideoSourceType = "unknown"
            if (data.type === "HLS" || data.url.includes(".m3u8") || data.url.includes("/m3u8/")) {
                videoType = "m3u8"
            } else if (data.type === "EMBED") {
                // Not support
                videoType = "unknown"
            } else if (data.url.includes(".mp4")) {
                videoType = "mp4"
            }

            let finalUrl = data.url
            if (finalUrl.startsWith("/")) {
                finalUrl = `${this.apiBaseUrl}${finalUrl}`
            }

            const headers: Record<string, string> = {}
            if (data.proxyHeaders) {
                Object.assign(headers, data.proxyHeaders)
            }

            const result: EpisodeServer = {
                server: serverName,
                headers: headers,
                videoSources: [{
                    url: finalUrl,
                    type: videoType,
                    quality: "auto",
                    subtitles: [],
                }],
            }

            return result
        } catch (error) {
            console.error("AniMapper findEpisodeServer error:", error)
            throw error
        }
    }
}