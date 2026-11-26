const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const parseDetail = async (response) => {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail)) return data.detail[0]?.msg;
  } catch {
    return null;
  }
  return null;
};

export async function request(path, { method = 'GET', body, token, raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('Could not reach the service.', 0);
  }

  if (!response.ok) {
    const detail = await parseDetail(response);
    throw new ApiError(detail || `Request failed with status ${response.status}.`, response.status);
  }

  if (raw) return response;

  if (response.status === 204) return null;

  try {
    return await response.json();
  } catch {
    throw new ApiError('The service sent an unreadable response.', response.status);
  }
}

export function getBackendCategory(category, gender) {
  let prefix;
  if (category === 'General') prefix = 'OPEN';
  else if (category === 'OBC-NCL') prefix = 'OBC_NCL';
  else if (category === 'SC') prefix = 'SC';
  else if (category === 'ST') prefix = 'ST';
  else if (category === 'EWS') prefix = 'EWS';
  else prefix = category;

  return prefix + (gender === 'Female' ? '_Female' : '_Gender_Neutral');
}

export function generateQuestions({ query, homestate }, token) {
  return request('/generate-questions', {
    method: 'POST',
    body: { query, homestate },
    token,
  });
}

export function recommend(payload, token) {
  return request('/recommend', { method: 'POST', body: payload, token });
}

export async function exportChoices(payload, token) {
  const response = await request('/export-choices', {
    method: 'POST',
    body: payload,
    token,
    raw: true,
  });
  return response.blob();
}


export function statistics(token) {
  return request('/statistics', { token });
}

export function colleges() {
  return request('/colleges');
}

export function branches() {
  return request('/branches');
}

export function getReviewTopics() {
  return request('/reviews/topics');
}

export function listCollegesWithReviews(params = {}) {
  const query = new URLSearchParams();
  if (params.topic) query.set('topic', params.topic);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  const qStr = query.toString();
  return request(`/reviews/colleges${qStr ? `?${qStr}` : ''}`);
}

export function getCollegeReviews(collegeIdentifier, params = {}) {
  const query = new URLSearchParams();
  if (params.topic) query.set('topic', params.topic);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  const qStr = query.toString();
  return request(`/reviews/college/${encodeURIComponent(collegeIdentifier)}${qStr ? `?${qStr}` : ''}`);
}

export function submitReview(payload) {
  return request('/reviews/submit', {
    method: 'POST',
    body: payload,
  });
}

export function voteReviewHelpful(reviewId, userIdentifier) {
  return request(`/reviews/vote/${reviewId}`, {
    method: 'POST',
    body: { user_identifier: userIdentifier },
  });
}

export function compareColleges(collegeIdA, collegeIdB) {
  return request(`/reviews/compare?college_id_a=${encodeURIComponent(collegeIdA)}&college_id_b=${encodeURIComponent(collegeIdB)}`);
}

const api = {
  generateQuestions,
  recommend,
  exportChoices,
  statistics,
  colleges,
  branches,
  getReviewTopics,
  listCollegesWithReviews,
  getCollegeReviews,
  submitReview,
  voteReviewHelpful,
  compareColleges,
};

export default api;
