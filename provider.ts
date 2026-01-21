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
                // Relaxed check: Include items even if provider is not explicitly listed in search results
                // This allows us to attempt fetching episodes for them in fallback
                /*
                if (item.providers && !item.providers[PROVIDER_NAME]) {
                    continue
                }
                */

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
        console.log(`DEBUG: v1.1.0 findEpisodes called for ID: ${id}`);

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
                    // If one page fails, we might still have previous episodes, but usually API fails completely.
                    // We'll log and break.
                    console.warn(`Failed to fetch episodes page: ${res.status} ${res.statusText}`);
                    break;
                }

                const data = await res.json() as AniMapperEpisodesResponse

                if (!data.episodes || data.episodes.length === 0) {
                    break;
                }

                for (const episode of data.episodes) {
                    const episodeNumberStr = episode.episodeNumber.trim()
                    const baseNumberMatch = episodeNumberStr.match(/^(\d+)/)

                    // Allow episodes without standard numbering if needed, but usually we need a number
                    // Fallback to 0 if not parsable? No, skip for now.
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
        let directEpisodes: EpisodeDetails[] = [];
        try {
            directEpisodes = await fetchEpisodesById(id);
        } catch (e) {
            console.warn("DEBUG: Initial fetch error", e);
        }

        // 2. Validate Direct Fetch
        let searchTitle = "";
        let directMappingValid = false;

        try {
            // Get Metadata to check title vs slug AND to get title for fallback
            const metaId = parseInt(id);
            if (!isNaN(metaId)) {
                const metaUrl = `${this.apiBaseUrl}/api/v1/metadata?id=${metaId}`;
                const metaRes = await fetch(metaUrl, { headers: { "User-Agent": "Seanime" } });
                if (metaRes.ok) {
                    const metaData = await metaRes.json() as any;
                    searchTitle = metaData.result?.titles?.en || metaData.result?.titles?.vi || metaData.result?.titles?.ja;

                    // Validation: Check if the slug matches the season
                    if (directEpisodes.length > 0 && metaData.result?.providers?.[PROVIDER_NAME]) {
                        const slug = metaData.result.providers[PROVIDER_NAME].providerMediaId;
                        if (this.validateSlug(searchTitle, slug)) {
                            console.log(`DEBUG: Direct mapping validated. Slug: ${slug}, Title: ${searchTitle}`);
                            directMappingValid = true;
                        } else {
                            console.warn(`DEBUG: Direct mapping INVALID. Slug: ${slug} does not match Title: ${searchTitle}`);
                        }
                    } else if (directEpisodes.length > 0) {
                        // No provider metadata but we have episodes? 
                        // This implies we can't validate. Assume valid or strict?
                        // Usually metadata should exist. If not, we trust episodes.
                        console.warn("DEBUG: No provider metadata to validate slug. Assuming valid.");
                        directMappingValid = true;
                    }
                }
            }
        } catch (e) {
            console.error("DEBUG: Metadata fetch error", e)
        }

        if (directEpisodes.length > 0 && directMappingValid) {
            return this.deduplicateAndSort(directEpisodes);
        }

        console.log("DEBUG: Direct fetch failed or invalid. Engaging Search Fallback.");

        // If we still don't have a title (metadata failed), try Anilist
        if (!searchTitle) {
            try {
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
            } catch (e) {
                console.error("DEBUG: Failed to get title from Anilist", e);
            }
        }

        if (!searchTitle) {
            throw new Error(`No episodes found for ID ${id} and could not retrieve title for fallback search.`);
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

            // Sort candidates by similarity to the search title
            const sortedCandidates = searchResults.map(c => ({
                candidate: c,
                similarity: this.getSimilarity(searchTitle, c.title)
            })).sort((a, b) => b.similarity - a.similarity);

            for (const { candidate, similarity } of sortedCandidates) {
                console.log(`DEBUG: Trying candidate ID: ${candidate.id} (${candidate.title}) - Similarity: ${similarity.toFixed(2)}`);

                // Avoid infinite loop if candidate is same as original ID and it was invalid
                if (candidate.id === id && !directMappingValid) {
                    console.log("DEBUG: Skipping original ID in fallback as it was determined invalid.");
                    continue;
                }

                // Skip if similarity is too low (e.g. less than 0.6)
                // Adjust this threshold as needed based on user feedback
                if (similarity < 0.6) {
                    console.log(`DEBUG: Skipping candidate ${candidate.title} due to low similarity.`);
                    continue;
                }

                try {
                    const fallbackEpisodes = await fetchEpisodesById(candidate.id);
                    if (fallbackEpisodes.length > 0) {
                        // Optionally validate these too? 
                        // For now we assume search results are fresh better candidates.
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

        // If we had direct episodes but they were invalid, and fallback failed...
        // Should we return the invalid ones as a last resort?
        // No, user specifically said "wrong season". Better to return nothing or error.
        throw new Error(`No episodes found for media ID: ${id} (Validated Fallback)`);
    }

    private validateSlug(title: string, slug: string): boolean {
        if (!title || !slug) return true;

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const t = normalize(title);
        const s = normalize(slug);

        // Check for specific season markers
        const seasonRegex = /(?:season|s|phan)(\d+)/i;

        const titleMatch = title.match(seasonRegex);
        const slugMatch = slug.match(seasonRegex);

        if (titleMatch && slugMatch) {
            // Both have season numbers, they MUST match
            if (titleMatch[1] !== slugMatch[1]) {
                return false;
            }
        } else if (titleMatch && !slugMatch) {
            // Title has season (e.g. "Season 3") but slug has no season info.
            // This is suspicious if the slug is just "slug-name" (usually implies S1).
            // But sometimes S3 slug is just "name".
            // However, usually providers append season.
            // Let's check if title is "Season 1"
            if (titleMatch[1] !== "1") {
                // Title is S2+, slug has no number.
                // Often "slug" = S1. "slug-2" = S2.
                // So if title is S3 and slug has no number -> likely S1Mismatch.
                // Mismatch!
                return false;
            }
        } else if (!titleMatch && slugMatch) {
            // Title has no season (implies S1), Slug has Season (e.g. s2).
            // Mismatch!
            if (slugMatch[1] !== "1") {
                return false;
            }
        }

        // Advanced: Check for "Part X" or "Cour X" if needed.
        // For now season number is the main culprit.

        return true;
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

    private getSimilarity(s1: string, s2: string): number {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) {
            return 1.0;
        }
        return (longer.length - this.editDistance(longer, shorter)) / parseFloat(longer.length.toString());
    }

    private editDistance(s1: string, s2: string): number {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const costs = new Array();
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0)
                    costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0)
                costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }
}
