import axios from 'axios';

const YOUTUBE_URL_REGEX = /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+?&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i;

/**
 * YouTube 공식 oEmbed 엔드포인트를 호출하여 API Key 없이 실제 영상 제목, 게시자명, 썸네일을 조회
 * @param {string} videoId 11자리 유튜브 비디오 ID
 * @returns {Promise<{title: string, author: string, thumbnail: string} | null>}
 */
async function fetchVideoOEmbed(videoId) {
  try {
    const res = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      timeout: 3500
    });
    if (res.data) {
      return {
        title: res.data.title || null,
        author: res.data.author_name || null,
        thumbnail: res.data.thumbnail_url || null
      };
    }
  } catch (err) {}
  return null;
}

/**
 * 유튜브 검색 헬퍼: 곡명 또는 유튜브 링크로부터 실제 Video ID 및 정확한 영상 정보 추출
 * @param {string} query 검색할 곡명 또는 유튜브 링크
 * @returns {Promise<{videoId: string, title: string, artist: string, thumbnail: string}>}
 */
export async function searchYouTube(query) {
  if (!query || typeof query !== 'string') {
    return {
      videoId: 'BBdC1rl5sKY',
      title: '신청곡',
      artist: '신청곡',
      thumbnail: 'https://img.youtube.com/vi/BBdC1rl5sKY/hqdefault.jpg'
    };
  }

  const trimmed = query.trim();

  // 1. 유튜브 URL 포함 여부 우선 검사 (youtu.be, watch?v=, shorts/, live/, music.youtube.com 등 모두 지원)
  const urlMatch = trimmed.match(YOUTUBE_URL_REGEX);
  if (urlMatch) {
    const videoId = urlMatch[1];
    const meta = await fetchVideoOEmbed(videoId);
    return {
      videoId,
      title: meta?.title || `유튜브 영상 (${videoId})`,
      artist: meta?.author || '신청곡',
      thumbnail: meta?.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  // 2. 검색어 기반 유튜브 실시간 검색
  try {
    const res = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 6000
    });

    const html = res.data;

    // A) ytInitialData JSON 정확 파싱 (가장 최신의 정확한 1순위 영상 제목과 정보)
    const initMatch = html.match(/ytInitialData\s*=\s*({.+?});/s) || html.match(/var ytInitialData = ({.+?});<\/script>/s);
    if (initMatch) {
      try {
        const json = JSON.parse(initMatch[1]);
        const sections = json?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (Array.isArray(sections)) {
          for (const s of sections) {
            const items = s?.itemSectionRenderer?.contents;
            if (Array.isArray(items)) {
              for (const it of items) {
                if (it.videoRenderer && it.videoRenderer.videoId) {
                  const vr = it.videoRenderer;
                  const vid = vr.videoId;
                  const t = vr.title?.runs?.[0]?.text || vr.title?.simpleText || trimmed;
                  const a = vr.ownerText?.runs?.[0]?.text || '신청곡';
                  const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
                  return { videoId: vid, title: t, artist: a, thumbnail: thumb };
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    // B) 정규식 폴백 + oEmbed 보완
    const vidMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (vidMatch) {
      const vid = vidMatch[1];
      const meta = await fetchVideoOEmbed(vid);
      return {
        videoId: vid,
        title: meta?.title || trimmed,
        artist: meta?.author || '신청곡',
        thumbnail: meta?.thumbnail || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
      };
    }
  } catch (err) {
    console.error('[YouTube Search Error]:', err.message);
  }

  // 3. 최후의 안전 폴백
  return {
    videoId: 'BBdC1rl5sKY',
    title: trimmed,
    artist: '신청곡',
    thumbnail: 'https://img.youtube.com/vi/BBdC1rl5sKY/hqdefault.jpg'
  };
}
