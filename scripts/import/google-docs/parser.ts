import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import * as cheerio from 'cheerio';
import { GoogleDocsParsedResult, GoogleDocsPage, GoogleDocsImageReference } from './types';

export async function parseMarkdown(markdown: string): Promise<GoogleDocsParsedResult> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify);

  const result = await processor.process(markdown);
  return splitHtml(result.toString());
}

export async function parseHtml(html: string): Promise<GoogleDocsParsedResult> {
  return splitHtml(html);
}

async function splitHtml(html: string): Promise<GoogleDocsParsedResult> {
  const $ = cheerio.load(html);
  const pages: GoogleDocsPage[] = [];
  const images: GoogleDocsImageReference[] = [];

  const headings = $('h1, h2');
  
  if (headings.length === 0) {
    const title = $('title').text() || $('h1').text() || 'Untitled Page';
    pages.push({
      title,
      content: $('body').html() || '',
      path: ''
    });
  } else {
    let currentTitle = '';
    let currentContent: string[] = [];
    let pathStack: string[] = [];

    $('body').children().each((_, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'h1' || tagName === 'h2') {
        if (currentTitle) {
          pages.push({
            title: currentTitle,
            content: currentContent.join(''),
            path: pathStack.join('/')
          });
        }

        currentTitle = $el.text().trim();
        const level = tagName === 'h1' ? 1 : 2;
        const slug = slugify(currentTitle);
        
        if (level === 1) {
          pathStack = [slug];
        } else {
          if (pathStack.length > 0) {
            pathStack = [pathStack[0], slug];
          } else {
            pathStack = [slug];
          }
        }
        currentContent = [];
      } else {
        if (currentTitle) {
          currentContent.push($el.prop('outerHTML') || '');
        } else {
          currentTitle = 'Untitled Page';
          currentContent.push($el.prop('outerHTML') || '');
        }
      }
    });

    if (currentTitle) {
      pages.push({
        title: currentTitle,
        content: currentContent.join(''),
        path: pathStack.join('/')
      });
    }
  }

  $('img').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('src') || '';
    if (src) {
      images.push({
        originalSrc: src,
        type: src.startsWith('http') ? 'remote' : 'local'
      });
    }
  });

  return { pages, images };
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
