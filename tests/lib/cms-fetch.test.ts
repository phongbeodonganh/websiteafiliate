import { afterEach, describe, expect, it, vi } from 'vitest';
import { cmsFetch, errorMessageForResponse } from '@/lib/cms-fetch';

// D-03: the shared auth-fetch helper must attach the bearer token, serialize a
// JSON body, and normalize every response into an explicit success/failure —
// never a silent success, never a thrown HTTP error.

type FetchMock = ReturnType<typeof vi.fn>;

function mockFetchResponse(status: number, body: unknown, ok = status >= 200 && status < 300): FetchMock {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function mockFetchReject(error: unknown): FetchMock {
  const fn = vi.fn().mockRejectedValue(error);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cmsFetch — Authorization header', () => {
  it('attaches Authorization: Bearer <token> when a token is present', async () => {
    const fetchMock = mockFetchResponse(200, { status: 'success', data: { id: '1' } });

    await cmsFetch('/api/v1/cms/articles', { token: 'abc123' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer abc123');
  });

  it('sends no Authorization header when the token is absent', async () => {
    const fetchMock = mockFetchResponse(200, { status: 'success', data: null });

    await cmsFetch('/api/v1/cms/articles', {});

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('sends no Authorization header when the token is null', async () => {
    const fetchMock = mockFetchResponse(200, { status: 'success', data: null });

    await cmsFetch('/api/v1/cms/articles', { token: null });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });
});

describe('cmsFetch — body serialization', () => {
  it('serializes a JSON body and sets Content-Type', async () => {
    const fetchMock = mockFetchResponse(201, { status: 'success', data: { id: '1' } });

    await cmsFetch('/api/v1/cms/articles', {
      method: 'POST',
      token: 't',
      body: { title: 'Hello', keyTakeaways: ['a'] },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ title: 'Hello', keyTakeaways: ['a'] }));
  });

  it('omits Content-Type and body when no body is supplied', async () => {
    const fetchMock = mockFetchResponse(200, { status: 'success', data: [] });

    await cmsFetch('/api/v1/cms/articles', { token: 't' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });
});

describe('cmsFetch — success path', () => {
  it('returns ok:true with data for a 200 success envelope', async () => {
    mockFetchResponse(200, { status: 'success', data: { id: '42', title: 'A' } });

    const result = await cmsFetch<{ id: string; title: string }>('/api/v1/cms/articles/42', { token: 't' });

    expect(result).toEqual({ ok: true, status: 200, data: { id: '42', title: 'A' } });
  });
});

describe('cmsFetch — status-mapped failures (never throws)', () => {
  it('maps a 401 to ok:false with the session-expired message', async () => {
    mockFetchResponse(401, { status: 'error', message: 'Unauthorized' });

    const result = await cmsFetch('/api/v1/cms/articles', { token: 'stale' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.message).toBe('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.');
    }
  });

  it('maps a 403 to the permission message', async () => {
    mockFetchResponse(403, { status: 'error', message: '403 Forbidden' });

    const result = await cmsFetch('/api/v1/cms/articles/1', { token: 't' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(
        'Bạn không có quyền thực hiện thao tác này. Hãy liên hệ quản trị viên nếu cần cấp quyền.'
      );
    }
  });

  it('maps a 404 (edit load) to the article-no-longer-exists message', async () => {
    mockFetchResponse(404, { status: 'error', message: 'Article not found' });

    const result = await cmsFetch('/api/v1/cms/articles/missing', { token: 't' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.message).toBe('Nội dung này không còn tồn tại hoặc đã bị xóa.');
    }
  });

  it('maps a 500 to the server-error message', async () => {
    mockFetchResponse(500, { status: 'error', message: 'Failed to create article' });

    const result = await cmsFetch('/api/v1/cms/articles', { method: 'POST', token: 't', body: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.');
    }
  });

  it('passes a 400 server message through verbatim', async () => {
    mockFetchResponse(400, { status: 'error', message: 'Title and Content are required' });

    const result = await cmsFetch('/api/v1/cms/articles', { method: 'POST', token: 't', body: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.message).toBe('Title and Content are required');
    }
  });

  it('falls back to the documented copy when a 400 carries no server message', async () => {
    mockFetchResponse(400, { status: 'error' });

    const result = await cmsFetch('/api/v1/cms/articles', { method: 'POST', token: 't', body: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Yêu cầu chưa hợp lệ. Hãy kiểm tra các trường thông tin và thử lại.');
    }
  });

  it('treats an error envelope on an HTTP 200 as a failure (not a silent success)', async () => {
    mockFetchResponse(200, { status: 'error', message: 'Nope' });

    const result = await cmsFetch('/api/v1/cms/articles', { token: 't' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(200);
      expect(result.message).toBe('Thao tác chưa hoàn tất. Vui lòng thử lại.');
    }
  });

  it('converts a thrown fetch rejection into ok:false status:0 with the network copy', async () => {
    mockFetchReject(new TypeError('Failed to fetch'));

    const result = await cmsFetch('/api/v1/cms/articles', { token: 't' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(0);
      expect(result.message).toBe('Không thể kết nối máy chủ. Hãy kiểm tra đường truyền và thử lại.');
    }
  });
});

describe('errorMessageForResponse — direct status matrix', () => {
  it('maps each documented status to its UI-SPEC copy', () => {
    expect(errorMessageForResponse(401)).toBe('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.');
    expect(errorMessageForResponse(403)).toBe(
      'Bạn không có quyền thực hiện thao tác này. Hãy liên hệ quản trị viên nếu cần cấp quyền.'
    );
    expect(errorMessageForResponse(404)).toBe(
      'Nội dung này không còn tồn tại hoặc đã bị xóa.'
    );
    expect(errorMessageForResponse(400, 'Custom validation text')).toBe('Custom validation text');
    expect(errorMessageForResponse(400)).toBe(
      'Yêu cầu chưa hợp lệ. Hãy kiểm tra các trường thông tin và thử lại.'
    );
    expect(errorMessageForResponse(500)).toBe(
      'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.'
    );
    expect(errorMessageForResponse(0)).toBe(
      'Không thể kết nối máy chủ. Hãy kiểm tra đường truyền và thử lại.'
    );
    expect(errorMessageForResponse(418)).toBe('Thao tác chưa hoàn tất. Vui lòng thử lại.');
  });
});
