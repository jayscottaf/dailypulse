import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { fetchPublicText, publicFeedUrl } from "@/lib/public-fetch";
import type { Source } from "@/db/schema";
import { sourceKind } from "@/lib/content-kind";

const parser = new Parser({customFields:{item:[["content:encoded","fullContent"],["media:thumbnail","mediaThumbnail"]]}});
export function plainText(html: string) {
  const {document}=parseHTML(`<html><body>${html}</body></html>`);
  document.querySelectorAll("script,style,noscript,iframe,form").forEach(node=>node.remove());
  document.querySelectorAll("p,div,li,br,h1,h2,h3").forEach(node=>node.append("\n"));
  return document.body.textContent?.replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n\n").trim().slice(0,40000) ?? "";
}
export function canonicalArticleUrl(value:string) {
  const url=publicFeedUrl(value); url.hash="";
  for(const key of [...url.searchParams.keys()]) if(/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/.test(key))url.searchParams.delete(key);
  url.searchParams.sort(); return url.href;
}
export async function parseArticleFeed(xml:string, source: Pick<Source,"rssUrl"|"youtubeChannelId"|"youtubeHandle">, now=new Date()) {
  const feed=await parser.parseString(xml);
  const kind=sourceKind(source);
  return feed.items.flatMap(item=>{
    try {
      if(!item.link||!item.title)return [];
      const url=canonicalArticleUrl(item.link);
      const publishedAt=new Date(item.isoDate ?? item.pubDate ?? "");
      // An absent date is not evidence that an old article was published today.
      if(!Number.isFinite(publishedAt.getTime())||publishedAt.getTime()>now.getTime()+3600000)return [];
      const raw=item as typeof item & {fullContent?:string; comments?:string};
      let body=plainText(raw.fullContent || item.content || item.summary || item.contentSnippet || "");
      // HN RSS supplies a discussion link, not the linked article or comments.
      if(new URL(source.rssUrl!).hostname==="news.ycombinator.com")body="";
      return [{youtubeVideoId:`rss:${createHash("sha256").update(url).digest("hex")}`,title:plainText(item.title),description:body.slice(0,500)||null,url,publishedAt,thumbnailUrl:null,
        transcriptStatus:"unavailable" as const,transcriptText:null,
        rawMetadata:{contentKind:kind,bodyText:body,bodyBasis:"feed_excerpt",feedUrl:source.rssUrl,discussionUrl:raw.comments??null}}];
    } catch {return [];}
  }).sort((a,b)=>b.publishedAt.getTime()-a.publishedAt.getTime());
}
export async function fetchArticleFeed(source: Source) {
  if(!source.rssUrl)throw new Error("Feed URL is required.");
  return parseArticleFeed(await fetchPublicText(source.rssUrl),source);
}
export async function enrichArticle(item: Awaited<ReturnType<typeof parseArticleFeed>>[number]) {
  if(item.rawMetadata.contentKind!=="article" || item.rawMetadata.bodyText.length>=600)return item;
  try {
    // Fetch only publisher-owned articles, not arbitrary links from forum posts.
    const feedHost=new URL(item.rawMetadata.feedUrl!).hostname.replace(/^www\./,"");
    if(new URL(item.url).hostname.replace(/^www\./,"")!==feedHost)return item;
    const html=await fetchPublicText(item.url);
    const {document}=parseHTML(html);
    // Never extract a page declaring subscription-only access.
    if(/"isAccessibleForFree"\s*:\s*(?:false|"false")/i.test(html))return item;
    const article=new Readability(document as unknown as Document).parse();
    const body=article?.textContent?.trim().slice(0,40000)??"";
    if(body.length>item.rawMetadata.bodyText.length)return {...item,description:body.slice(0,500),rawMetadata:{...item.rawMetadata,bodyText:body,bodyBasis:"article_text"}};
  }catch{/* Keep an accurately labeled feed excerpt if the article cannot be read. */}
  return item;
}
