const { MOCK_USERS } = require('./mockUsers');

function jaccard(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

// 누적 탐색 경로(카테고리)로 가장 유사한 mock 유저 1명 할당 — 클릭마다 재평가
function assignMockUser(sessionCategories) {
  const unique = [...new Set(sessionCategories)];
  if (unique.length === 0) return null;
  return MOCK_USERS
    .map(u => ({ ...u, sim: jaccard(unique, u.categories) }))
    .sort((a, b) => b.sim - a.sim)[0];
}

// 할당된 mock 유저 ↔ 나머지 mock 유저 간 유사도로 peer group 구성
function findPeers(assignedUser, topN = 10) {
  const assignedProfile = [...assignedUser.categories, ...assignedUser.concerns];
  return MOCK_USERS
    .filter(u => u.id !== assignedUser.id)
    .map(u => ({
      ...u,
      sim: jaccard(assignedProfile, [...u.categories, ...u.concerns]),
    }))
    .filter(u => u.sim > 0)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, topN);
}

function derivePeerInsights(peers) {
  if (peers.length === 0) return null;

  const occupationCounts = {};
  const concernCounts = {};
  let totalAge = 0;

  peers.forEach(u => {
    occupationCounts[u.occupation] = (occupationCounts[u.occupation] || 0) + 1;
    u.concerns.forEach(c => { concernCounts[c] = (concernCounts[c] || 0) + 1; });
    totalAge += u.age;
  });

  const dominantOccupation = Object.entries(occupationCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  const avgAge = Math.round(totalAge / peers.length);

  const topConcerns = Object.entries(concernCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c]) => c);

  return { count: peers.length, avgAge, dominantOccupation, topConcerns };
}

module.exports = { assignMockUser, findPeers, derivePeerInsights };
