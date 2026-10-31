import axios from 'axios';

/**
 * 유튜브 검색 헬퍼: 곡명 또는 검색어로 실제 유튜브 Video ID 검색
 * @param {string} query 검색할 곡명 또는 유튜브 링크
 * @returns {Promise<{videoId: string, title: string}>}
 */
export async function searchYouTube(query) {
  if (!query || typeof query !== 'string') {
    return { videoId: 'BBdC1rl5sKY', title: '신청곡' };
  }

  const trimmed = query.trim();

  // 1. 이미 유튜브 URL인 경우 videoId 바로 추출
  const urlMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (urlMatch) {
    return {
      videoId: urlMatch[1],
      title: trimmed.length < 60 ? trimmed : `유튜브 영상 (${urlMatch[1]})`
    };
  }

  // 2. 유튜브 실시간 검색을 통해 실제 최상단 곡의 Video ID 조회
  try {
    const res = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 6000
    });

    const html = res.data;
    const vidMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (vidMatch) {
      const videoId = vidMatch[1];
      return {
        videoId,
        title: trimmed
      };
    }
  } catch (err) {
    console.error('[YouTube Search Error]:', err.message);
  }

  // 검색 실패 시 기본 음악으로 안전 폴백
  return {
    videoId: 'BBdC1rl5sKY',
    title: trimmed
  };
}
