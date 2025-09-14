import axios from 'axios';

interface Memory {
	id: string;
	content: string;
	metadata?: any;
	createdAt?: string;
	similarity?: number;
}

const API_BASE = process.env['R3CALL_API_URL'] || 'http://localhost:3030';
const USER_ID = process.env['R3CALL_USER_ID'] || 'default';

const getHeaders = (apiKey?: string) => {
	return apiKey
		? {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
		  }
		: {
				'Content-Type': 'application/json',
		  };
};

export const loadMemories = async (apiKey?: string): Promise<Memory[]> => {
	const headers = getHeaders(apiKey);
	const response = await axios.get(`${API_BASE}/memories`, {
		headers,
		params: {user_id: USER_ID, limit: 50},
	});
	return response.data.memories || [];
};

export const searchMemories = async (query: string, apiKey?: string): Promise<Memory[]> => {
	if (!query.trim()) return [];
    const headers = getHeaders(apiKey);
	const response = await axios.post(
		`${API_BASE}/search`,
		{
			query: query,
			user_id: USER_ID,
			limit: 20,
		},
		{headers},
	);
	return response.data.results || [];
};

export const addMemory = async (content: string, apiKey?: string): Promise<void> => {
	if (!content.trim()) return;
    const headers = getHeaders(apiKey);
	await axios.post(
		`${API_BASE}/add`,
		{
			content: content,
			user_id: USER_ID,
		},
		{headers},
	);
};

export const deleteMemory = async (memoryId: string, apiKey?: string): Promise<void> => {
    const headers = getHeaders(apiKey);
	await axios.delete(`${API_BASE}/memory/${memoryId}`, {headers});
};

