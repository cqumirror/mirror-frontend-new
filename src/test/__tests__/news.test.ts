import { describe, expect, it } from 'vitest';

import { extractFirstSentence, getNewsList } from '@/news';

describe('news excerpts', () => {
  it('extracts the first sentence from MDX body instead of metadata summary', () => {
    expect(
      extractFirstSentence(`export const meta = { title: '标题', summary: '旧摘要' }

# 标题

这是正文第一句话。这里是第二句话。`)
    ).toBe('这是正文第一句话。');
  });

  it('provides an excerpt for every news list item', () => {
    expect(getNewsList().every((item) => item.excerpt.length > 0)).toBe(true);
  });
});
