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
                const metadataRes = await fetch(metadataUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    }
                })

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
            const res = await fetch(searchUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            })

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
        console.log(`DEBUG: v1.0.9 findEpisodes called for ID: ${id}`);

        // Helper to fetch episodes by ID
        const fetchEpisodesById = async (targetId: string | number): Promise<EpisodeDetails[]> => {
            console.log(`DEBUG: Attempting to fetch episodes for ID: ${targetId}`);
            let offset = 0
            const limit = 20
            const allEpisodes: EpisodeDetails[] = []
            let hasNextPage = true;

            while (hasNextPage) {
                const episodesUrl = `${this.apiBaseUrl}/api/v1/stream/episodes?id=${targetId}&provider=${PROVIDER_NAME}&limit=${limit}&offset=${offset}`
                const res = await fetch(episodesUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    }
                })

                if (!res.ok) {
                    if (res.status === 404) {
                        console.warn(`DEBUG: 404 for ID ${targetId}`);
                        return [];
                    }
                    throw new Error(`Failed to fetch episodes: ${res.status} ${res.statusText}`);
                }

                const data = await res.json() as AniMapperEpisodesResponse

                if (!data.episodes || data.episodes.length === 0) {
                    break;
                }

                for (const episode of data.episodes) {
                    const episodeNumberStr = episode.episodeNumber.trim()
                    const baseNumberMatch = episodeNumberStr.match(/^(\d+)/)
                    if (!baseNumberMatch) continue;

                    const baseNumber = parseInt(baseNumberMatch[1], 10)
                    if (isNaN(baseNumber)) continue;

                    const title = (episodeNumberStr.includes("_") || (episodeNumberStr.includes("-") && episodeNumberStr.split("-").length > 1))
                        ? `Episode ${episodeNumberStr}`
                        : `Episode ${baseNumber}`

                    const episodeDetail: EpisodeDetails & { episodeNumberStr?: string; server?: string; mediaId?: string | number } = {
                        id: episode.episodeId,
                        number: baseNumber,
                        url: "",
                        title: title,
                    }
                    episodeDetail.episodeNumberStr = episodeNumberStr
                    episodeDetail.mediaId = targetId
                    if (episode.server) episodeDetail.server = episode.server
                    allEpisodes.push(episodeDetail)
                }

                if (!data.hasNextPage) {
                    hasNextPage = false;
                } else {
                    offset += limit
                }
            }
            return allEpisodes;
        }

        // 1. Try Direct Fetch
        try {
            const episodes = await fetchEpisodesById(id);
            if (episodes.length > 0) return this.deduplicateAndSort(episodes);
        } catch (e) {
            console.warn("DEBUG: Initial fetch error", e);
        }

        console.log("DEBUG: Direct fetch failed or returned no episodes. Engaging Search Fallback.");

        // 2. Get Title from Metadata or Anilist to Search
        let searchTitle = "";
        try {
            // Try AniMapper Metadata first
            const metaId = parseInt(id);
            if (!isNaN(metaId)) {
                const metaUrl = `${this.apiBaseUrl}/api/v1/metadata?id=${metaId}`;
                const metaRes = await fetch(metaUrl, { headers: { "User-Agent": "Seanime" } });
                if (metaRes.ok) {
                    const metaData = await metaRes.json() as any;
                    searchTitle = metaData.result?.titles?.en || metaData.result?.titles?.vi || metaData.result?.titles?.ja;
                }
            }

            // If no title, try Anilist GraphQL
            if (!searchTitle) {
                console.log("DEBUG: Fetching title from Anilist...");
                const query = `query ($id: Int) { Media (id: $id, type: ANIME) { title { romaji english native } } }`;
                const anilistRes = await fetch("https://graphql.anilist.co", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({ query, variables: { id: parseInt(id) } })
                });
                if (anilistRes.ok) {
                    const alData = await anilistRes.json() as any;
                    searchTitle = alData.data?.Media?.title?.english || alData.data?.Media?.title?.romaji;
                }
            }
        } catch (e) {
            console.error("DEBUG: Failed to get title for fallback", e);
        }

        if (!searchTitle) {
            throw new Error("No episodes found and could not retrieve title for fallback search.");
        }

        console.log(`DEBUG: Searching fallback for title: ${searchTitle}`);

        // 3. Search and Try Candidates
        try {
            const searchResults = await this.search({
                query: searchTitle,
                dub: false,
                media: {
                    id: parseInt(id) || 0,
                    synonyms: [],
                    isAdult: false
                } as any
            });
            console.log(`DEBUG: Found ${searchResults.length} candidates.`);

            for (const candidate of searchResults) {
                console.log(`DEBUG: Trying candidate ID: ${candidate.id} (${candidate.title})`);
                try {
                    // Try fetching with the candidate ID found in search
                    // Important: The candidate.id from search() is string, but fetchEpisodesById handles string|number
                    const fallbackEpisodes = await fetchEpisodesById(candidate.id);
                    if (fallbackEpisodes.length > 0) {
                        console.log(`DEBUG: Success with candidate ID ${candidate.id}`);
                        return this.deduplicateAndSort(fallbackEpisodes);
                    }
                } catch (e) {
                    console.warn(`DEBUG: Candidate ${candidate.id} failed`, e);
                }
            }
        } catch (e) {
            console.error("DEBUG: Search fallback error", e);
        }

        throw new Error("No episodes found after fallback search.");
    }

    private deduplicateAndSort(episodes: EpisodeDetails[]): EpisodeDetails[] {
        const seenEpisodes = new Map<string, EpisodeDetails & { episodeNumberStr?: string; server?: string; mediaId?: number }>()
        for (const episode of episodes) {
            const episodeNumberStr = (episode as any).episodeNumberStr || episode.number.toString()
            if (!seenEpisodes.has(episodeNumberStr)) {
                seenEpisodes.set(episodeNumberStr, episode)
            }
        }
        const deduplicatedEpisodes = Array.from(seenEpisodes.values())

        deduplicatedEpisodes.sort((a, b) => {
            const aStr = (a as any).episodeNumberStr || a.number.toString()
            const bStr = (b as any).episodeNumberStr || b.number.toString()
            const aBase = parseInt((aStr.match(/^(\d+)/) || ['0', '0'])[1])
            const bBase = parseInt((bStr.match(/^(\d+)/) || ['0', '0'])[1])
            if (aBase !== bBase) return aBase - bBase;
            return aStr.localeCompare(bStr);
        });

        deduplicatedEpisodes.forEach(ep => {
            delete (ep as any).episodeNumberStr
            ep.number = (ep.number | 0)
        })
        return deduplicatedEpisodes;
    }

    async findEpisodeServer(episode: EpisodeDetails, server: string): Promise<EpisodeServer> {
        try {
            const episodeServer = (episode as any).server
            let serverName = server && server !== "default" ? server : (episodeServer || "AnimeVsub")

            const episodeData = episode.id

            const sourceUrl = `${this.apiBaseUrl}/api/v1/stream/source?episodeData=${encodeURIComponent(episodeData)}&provider=${PROVIDER_NAME}`
            const res = await fetch(sourceUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            })

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
