/// <reference path="./onlinestream-provider.d.ts" />
/// <reference path="./core.d.ts" />

const API_BASE_URL = "https://api.hasukatsu.site"
const PROVIDER_NAME = "ANIMEVIETSUB"

type HasukatsuSearchResponse = {
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
    }>
    total: number
    limit: number
    offset: number
    hasNextPage: boolean
}

type HasukatsuEpisodesResponse = {
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

type HasukatsuSourceResponse = {
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
            if (opts.media?.id) {
                // If it's a direct ID lookup, we don't need metadata because Hasukatsu already uses AniList ID directly!
                const title =
                    opts.media.englishTitle ||
                    opts.media.romajiTitle ||
                    opts.query
                return [{
                    id: opts.media.id.toString(),
                    title: title,
                    url: "",
                    subOrDub: "sub",
                }]
            }

            const searchUrl = `${this.apiBaseUrl}/search?title=${encodeURIComponent(opts.query)}&limit=20`
            const res = await fetch(searchUrl)

            if (!res.ok) {
                console.error(`Hasukatsu search failed: ${res.status} ${res.statusText}`)
                return []
            }

            const data = await res.json() as HasukatsuSearchResponse

            if (!data.success || !data.results) {
                return []
            }

            const results: SearchResult[] = []

            for (const item of data.results) {
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
            console.error("Hasukatsu search error:", error)
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
                const episodesUrl = `${this.apiBaseUrl}/stream/episodes?id=${mediaId}&provider=${PROVIDER_NAME}&limit=${limit}&offset=${offset}`
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

                const data = await res.json() as HasukatsuEpisodesResponse

                if (!data.episodes || data.episodes.length === 0) {
                    break
                }

                for (const episode of data.episodes) {
                    const episodeNumberStr = (episode.episodeNumber ?? "").trim()

                    const baseNumberMatch = episodeNumberStr.match(/^(\d+)/)

                    let episodeNumberInt = 1
                    let title = episodeNumberStr || "Episode 1"

                    if (baseNumberMatch) {
                        const baseNumber = parseInt(baseNumberMatch[1], 10)
                        episodeNumberInt = (baseNumber | 0)

                        const hasUnderscoreSuffix = episodeNumberStr.includes("_")
                        const hasDashRange = episodeNumberStr.includes("-") && episodeNumberStr.split("-").length > 1

                        title = (hasUnderscoreSuffix || hasDashRange)
                            ? `Episode ${episodeNumberStr}`
                            : `Episode ${episodeNumberInt}`
                    }

                    const episodeDetail: EpisodeDetails & { episodeNumberStr?: string; server?: string; mediaId?: number } = {
                        id: episode.episodeId,
                        number: episodeNumberInt,
                        url: "",
                        title: title,
                    }

                    episodeDetail.episodeNumberStr = episodeNumberStr || episodeNumberInt.toString()
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

            // Remove duplicates: if same episode number exists, keep only one
            const seenEpisodes = new Map<string, EpisodeDetails & { episodeNumberStr?: string; server?: string; mediaId?: number }>()

            for (const episode of allEpisodes) {
                const episodeNumberStr = (episode as any).episodeNumberStr || episode.number.toString()
                if (!seenEpisodes.has(episodeNumberStr)) {
                    seenEpisodes.set(episodeNumberStr, episode)
                }
            }

            const deduplicatedEpisodes = Array.from(seenEpisodes.values())

            // Sort episodes by parsing the episode number string
            deduplicatedEpisodes.sort((a, b) => {
                const aStr = (a as any).episodeNumberStr || a.number.toString()
                const bStr = (b as any).episodeNumberStr || b.number.toString()

                const aBaseMatch = aStr.match(/^(\d+)/)
                const bBaseMatch = bStr.match(/^(\d+)/)

                if (!aBaseMatch || !bBaseMatch) {
                    return aStr.localeCompare(bStr)
                }

                const aBase = parseInt(aBaseMatch[1], 10)
                const bBase = parseInt(bBaseMatch[1], 10)

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
                                return parseInt(aSuffixMatch[1], 10) - parseInt(bSuffixMatch[1], 10)
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

            deduplicatedEpisodes.forEach(ep => {
                delete (ep as any).episodeNumberStr
                ep.number = (ep.number | 0)
            })

            return deduplicatedEpisodes
        } catch (error) {
            console.error("Hasukatsu findEpisodes error:", error)
            throw error
        }
    }

    async findEpisodeServer(episode: EpisodeDetails, server: string): Promise<EpisodeServer> {
        try {
            const episodeServer = (episode as any).server
            const serverName = server && server !== "default" ? server : (episodeServer || "AnimeVsub")

            const episodeData = episode.id

            const sourceUrl = `${this.apiBaseUrl}/stream/source?episodeData=${encodeURIComponent(episodeData)}&server=${encodeURIComponent(serverName)}`
            const res = await fetch(sourceUrl)

            if (!res.ok) {
                throw new Error(`Failed to fetch episode source: ${res.status} ${res.statusText}`)
            }

            const data = await res.json() as HasukatsuSourceResponse

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
                headers,
                videoSources: [{
                    url: finalUrl,
                    type: videoType,
                    quality: "auto",
                    subtitles: [],
                }],
            }

            return result
        } catch (error) {
            console.error("Hasukatsu findEpisodeServer error:", error)
            throw error
        }
    }
}
