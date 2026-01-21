/// <reference path="./onlinestream-provider.d.ts" />
/// <reference path="./core.d.ts" />

// AniMapper API base URL
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

    constructor() {
        this.apiBaseUrl = API_BASE_URL
    }

    getSettings(): Settings {
        return {
            episodeServers: ["AnimeVsub"],
            supportsDub: false,
        }
    }

    async search(opts: SearchOptions): Promise<SearchResult[]> {
        try {
            // Priority check: If media ID is available, check metadata first
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

            // Fallback to search API
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
                // Only include items with ANIMEVIETSUB provider
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
        console.log("DEBUG: v1.0.2 findEpisodes called for ID:", id);
        try {
            const mediaId = parseInt(id)
            if (isNaN(mediaId)) {
                throw new Error(`Invalid media ID: ${id}`)
            }

            let offset = 0
            const limit = 20 // Reduce limit for stability
            const allEpisodes: EpisodeDetails[] = []

            // Pagination loop
            while (true) {
                const episodesUrl = `${this.apiBaseUrl}/api/v1/stream/episodes?id=${mediaId}&provider=${PROVIDER_NAME}&limit=${limit}&offset=${offset}`
                const res = await fetch(episodesUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    }
                })

                if (!res.ok) {
                    if (res.status === 404) {
                        let errorData: any = {};
                        try {
                            errorData = await res.json();
                        } catch (e) {
                            // parse error, ignore
                        }

                        if (errorData && (errorData.code === "MAPPING_NOT_FOUND" || errorData.code === "EPISODES_NOT_FOUND")) {
                            throw new Error(`No episodes found for media ID: ${mediaId}`);
                        }
                    }
                    throw new Error(`Failed to fetch episodes: ${res.status} ${res.statusText}`);
                }

                const data = await res.json() as AniMapperEpisodesResponse

                if (!data.episodes || data.episodes.length === 0) {
                    break
                }

                // Process episodes
                for (const episode of data.episodes) {
                    const episodeNumberStr = episode.episodeNumber.trim()

                    // Parse base episode number
                    const baseNumberMatch = episodeNumberStr.match(/^(\d+)/)
                    if (!baseNumberMatch) {
                        continue
                    }

                    const baseNumber = parseInt(baseNumberMatch[1], 10)
                    if (isNaN(baseNumber)) {
                        continue
                    }

                    // Check for special formats
                    const hasUnderscoreSuffix = episodeNumberStr.includes("_")
                    const hasDashRange = episodeNumberStr.includes("-") && episodeNumberStr.split("-").length > 1

                    const episodeNumber = baseNumber

                    // Create title
                    const title = (hasUnderscoreSuffix || hasDashRange)
                        ? `Episode ${episodeNumberStr}`
                        : `Episode ${episodeNumber}`

                    // Force integer conversion
                    const episodeNumberInt = (parseInt(baseNumber.toString(), 10)) | 0

                    const episodeDetail: EpisodeDetails & { episodeNumberStr?: string; server?: string; mediaId?: number } = {
                        id: episode.episodeId,
                        number: episodeNumberInt,
                        url: "",
                        title: title,
                    }
                    episodeDetail.episodeNumberStr = episodeNumberStr
                    episodeDetail.mediaId = mediaId
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

            // Deduplication
            const seenEpisodes = new Map<string, EpisodeDetails & { episodeNumberStr?: string; server?: string; mediaId?: number }>()

            for (const episode of allEpisodes) {
                const episodeNumberStr = (episode as any).episodeNumberStr || episode.number.toString()

                if (!seenEpisodes.has(episodeNumberStr)) {
                    seenEpisodes.set(episodeNumberStr, episode)
                }
            }

            const deduplicatedEpisodes = Array.from(seenEpisodes.values())

            // Smart sorting
            deduplicatedEpisodes.sort((a, b) => {
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

            // Clean up and return
            deduplicatedEpisodes.forEach(ep => {
                delete (ep as any).episodeNumberStr
                ep.number = (ep.number | 0)
            })

            return deduplicatedEpisodes
        } catch (error) {
            console.error("AniMapper findEpisodes error:", error)
            throw error
        }
    }

    async findEpisodeServer(episode: EpisodeDetails, server: string): Promise<EpisodeServer> {
        try {
            const episodeServer = (episode as any).server
            let serverName = server && server !== "default" ? server : (episodeServer || "AnimeVsub")

            const episodeData = episode.id

            const sourceUrl = `${this.apiBaseUrl}/api/v1/stream/source?episodeData=${encodeURIComponent(episodeData)}&provider=${PROVIDER_NAME}`
            const res = await fetch(sourceUrl)

            if (!res.ok) {
                throw new Error(`Failed to fetch episode source: ${res.status} ${res.statusText}`)
            }

            const data = await res.json() as AniMapperSourceResponse

            let videoType: VideoSourceType = "unknown"
            if (data.type === "HLS" || data.url.includes(".m3u8") || data.url.includes("/m3u8/")) {
                videoType = "m3u8"
            } else if (data.type === "EMBED") {
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
