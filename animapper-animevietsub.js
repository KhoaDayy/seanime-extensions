/// <reference path="./online-streaming-provider.d.ts" />
/// <reference path="./core.d.ts" />

/**
 * AniMapper AnimeVietSub Provider for Seanime
 * Optimized for ANIMEVIETSUB with DU server focus
 * 
 * API Documentation: https://animapper.net/docs
 * Based on: https://github.com/SinonCute/seanime-extensions
 */

class Provider {
    constructor() {
        this.api = "https://api.animapper.net/api/v1"
        this.providerName = "ANIMEVIETSUB"
        this.defaultServer = "AnimeVsub"
    }

    /**
     * Get provider settings
     */
    getSettings() {
        return {
            episodeServers: ["AnimeVsub"],
            supportsDub: false
        }
    }

    /**
     * Search for anime using AniMapper API
     * Prioritizes direct metadata check if media ID is available
     */
    async search(opts) {
        try {
            console.log("Searching with query:", opts.query)

            // Nếu có media ID, check metadata trước (faster và accurate hơn)
            if (opts.media && opts.media.id) {
                console.log("Checking metadata for media ID:", opts.media.id)
                var metadataUrl = this.api + "/metadata?id=" + opts.media.id
                var metadataReq = await fetch(metadataUrl)

                if (metadataReq.ok) {
                    var metadata = await metadataReq.json()
                    if (metadata.success && metadata.result && metadata.result.providers && metadata.result.providers[this.providerName]) {
                        var title = ""
                        if (metadata.result.titles) {
                            title = metadata.result.titles.en || metadata.result.titles.vi || metadata.result.titles.ja || ""
                        }
                        if (!title && opts.media) {
                            title = opts.media.englishTitle || opts.media.romajiTitle || ""
                        }
                        if (!title) {
                            title = opts.query
                        }

                        console.log("Found direct match via metadata")
                        return [{
                            id: String(opts.media.id),
                            title: title,
                            url: "",
                            subOrDub: "sub"
                        }]
                    }
                }
            }

            // Fallback to search API
            var searchUrl = this.api + "/search?title=" + encodeURIComponent(opts.query) + "&mediaType=ANIME&limit=20&offset=0"

            if (opts.year) {
                searchUrl += "&startDateYear=" + opts.year
            }

            var req = await fetch(searchUrl)

            if (!req.ok) {
                console.error("Search request failed:", req.status, req.statusText)
                return []
            }

            var data = await req.json()
            var results = []

            if (!data || !data.success || !data.results) {
                console.log("No results found")
                return []
            }

            // Chỉ lấy anime có ANIMEVIETSUB provider
            for (var i = 0; i < data.results.length; i++) {
                var item = data.results[i]

                // Skip nếu không có ANIMEVIETSUB
                if (!item.providers || !item.providers[this.providerName]) {
                    continue
                }

                var title = ""
                if (item.titles) {
                    title = item.titles.en || item.titles.vi || item.titles.ja || ""
                }
                if (!title) {
                    title = opts.query
                }

                results.push({
                    id: String(item.id),
                    title: title,
                    url: "",
                    subOrDub: "sub"
                })
            }

            console.log("Found", results.length, "results with ANIMEVIETSUB")
            return results

        } catch (e) {
            console.error("Error in search:", e)
            return []
        }
    }

    /**
     * Find episodes for a media ID
     * Handles pagination and deduplication
     */
    async findEpisodes(id) {
        try {
            console.log("Finding episodes for ID:", id)

            var mediaId = parseInt(id)
            if (isNaN(mediaId)) {
                throw new Error("Invalid media ID: " + id)
            }

            var offset = 0
            var limit = 100
            var allEpisodes = []

            // Pagination loop để lấy tất cả episodes
            while (true) {
                var episodesUrl = this.api + "/stream/episodes?id=" + mediaId + "&provider=" + this.providerName + "&limit=" + limit + "&offset=" + offset

                console.log("Fetching episodes, offset:", offset)
                var episodesReq = await fetch(episodesUrl)

                if (!episodesReq.ok) {
                    if (episodesReq.status === 404) {
                        var errorData = {}
                        try {
                            errorData = await episodesReq.json()
                        } catch (e) {
                            // Ignore parse error
                        }

                        if (errorData.code === "MAPPING_NOT_FOUND" || errorData.code === "EPISODES_NOT_FOUND") {
                            throw new Error("No episodes found for media ID: " + mediaId)
                        }
                    }
                    throw new Error("Failed to fetch episodes: " + episodesReq.status + " " + episodesReq.statusText)
                }

                var episodesData = await episodesReq.json()

                if (!episodesData.episodes || episodesData.episodes.length === 0) {
                    break
                }

                // Process episodes
                for (var i = 0; i < episodesData.episodes.length; i++) {
                    var ep = episodesData.episodes[i]
                    var episodeNumberStr = String(ep.episodeNumber).trim()

                    // Parse base episode number
                    var baseNumberMatch = episodeNumberStr.match(/^(\d+)/)
                    if (!baseNumberMatch) {
                        console.log("Skipping invalid episode number:", episodeNumberStr)
                        continue
                    }

                    var baseNumber = parseInt(baseNumberMatch[1])
                    if (isNaN(baseNumber)) {
                        continue
                    }

                    // Check for special formats
                    var hasUnderscoreSuffix = episodeNumberStr.indexOf("_") !== -1
                    var hasDashRange = episodeNumberStr.indexOf("-") !== -1 && episodeNumberStr.split("-").length > 1

                    var episodeNumber = baseNumber

                    // Create title
                    var title = "Episode " + episodeNumber
                    if (hasUnderscoreSuffix || hasDashRange) {
                        title = "Episode " + episodeNumberStr
                    }

                    // Force integer conversion
                    var episodeNumberInt = parseInt(baseNumber.toString()) | 0

                    var episodeDetail = {
                        id: ep.episodeId,
                        number: episodeNumberInt,
                        url: "",
                        title: title,
                        episodeNumberStr: episodeNumberStr,
                        mediaId: mediaId
                    }

                    if (ep.server) {
                        episodeDetail.server = ep.server
                    }

                    allEpisodes.push(episodeDetail)
                }

                // Check pagination
                if (!episodesData.hasNextPage) {
                    break
                }

                offset += limit
            }

            if (allEpisodes.length === 0) {
                throw new Error("No episodes found")
            }

            console.log("Total episodes fetched:", allEpisodes.length)

            // Deduplication: keep unique episodes based on episodeNumberStr
            var seenEpisodes = {}
            var deduplicatedEpisodes = []

            for (var i = 0; i < allEpisodes.length; i++) {
                var ep = allEpisodes[i]
                var key = ep.episodeNumberStr

                if (!seenEpisodes[key]) {
                    seenEpisodes[key] = true
                    deduplicatedEpisodes.push(ep)
                }
            }

            console.log("After deduplication:", deduplicatedEpisodes.length)

            // Sort episodes
            deduplicatedEpisodes.sort(function (a, b) {
                var aStr = a.episodeNumberStr || String(a.number)
                var bStr = b.episodeNumberStr || String(b.number)

                var aBaseMatch = aStr.match(/^(\d+)/)
                var bBaseMatch = bStr.match(/^(\d+)/)

                if (!aBaseMatch || !bBaseMatch) {
                    return aStr < bStr ? -1 : (aStr > bStr ? 1 : 0)
                }

                var aBase = parseInt(aBaseMatch[1])
                var bBase = parseInt(bBaseMatch[1])

                if (aBase !== bBase) {
                    return aBase - bBase
                }

                // Same base number, check suffix
                var aHasUnderscore = aStr.indexOf("_") !== -1
                var bHasUnderscore = bStr.indexOf("_") !== -1

                if (!aHasUnderscore && bHasUnderscore) return -1
                if (aHasUnderscore && !bHasUnderscore) return 1

                return aStr < bStr ? -1 : (aStr > bStr ? 1 : 0)
            })

            // Clean up và return
            var finalEpisodes = []
            for (var i = 0; i < deduplicatedEpisodes.length; i++) {
                var ep = deduplicatedEpisodes[i]
                finalEpisodes.push({
                    id: ep.id,
                    number: ep.number | 0,
                    url: ep.url,
                    title: ep.title
                })
            }

            console.log("Returning", finalEpisodes.length, "episodes")
            return finalEpisodes

        } catch (e) {
            console.error("Error in findEpisodes:", e)
            throw e
        }
    }

    /**
     * Get video sources for an episode
     * Optimized for ANIMEVIETSUB DU server
     */
    async findEpisodeServer(episode, server) {
        try {
            console.log("Finding episode server for:", episode.id)

            var selectedServer = (server && server !== "default") ? server : this.defaultServer
            var episodeData = episode.id

            console.log("Using provider:", this.providerName, "episodeData:", episodeData, "server:", selectedServer)

            // Lấy nguồn stream (không cần pass server param vì API tự chọn)
            var sourceUrl = this.api + "/stream/source?episodeData=" + encodeURIComponent(episodeData) + "&provider=" + this.providerName

            var sourceReq = await fetch(sourceUrl)

            if (!sourceReq.ok) {
                throw new Error("Failed to fetch stream source: " + sourceReq.status + " " + sourceReq.statusText)
            }

            var sourceData = await sourceReq.json()

            if (!sourceData || !sourceData.url) {
                throw new Error("No stream URL found")
            }

            // Determine video type
            var videoType = "unknown"
            if (sourceData.type === "HLS" || sourceData.url.indexOf(".m3u8") !== -1 || sourceData.url.indexOf("/m3u8/") !== -1) {
                videoType = "m3u8"
            } else if (sourceData.type === "EMBED") {
                videoType = "unknown" // Not supported
            } else if (sourceData.url.indexOf(".mp4") !== -1) {
                videoType = "mp4"
            }

            // Handle relative URLs
            var finalUrl = sourceData.url
            if (finalUrl.indexOf("/") === 0) {
                finalUrl = "https://api.animapper.net" + finalUrl
            }

            // Setup headers
            var headers = {}
            if (sourceData.proxyHeaders) {
                for (var key in sourceData.proxyHeaders) {
                    if (sourceData.proxyHeaders.hasOwnProperty(key)) {
                        headers[key] = sourceData.proxyHeaders[key]
                    }
                }
            }

            var result = {
                server: selectedServer,
                headers: headers,
                videoSources: [{
                    url: finalUrl,
                    type: videoType,
                    quality: "auto",
                    subtitles: []
                }]
            }

            console.log("Successfully got stream source, type:", videoType)
            return result

        } catch (e) {
            console.error("Error in findEpisodeServer:", e)
            throw e
        }
    }
}
