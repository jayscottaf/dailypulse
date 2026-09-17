import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function publicFeedUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || isIP(url.hostname.replace(/[\[\]]/g, "")) || !url.hostname.includes(".") || /\.(localhost|local|internal)$/.test(url.hostname)) throw new Error("Use a public HTTPS feed URL.");
  return url;
}
export function publicIPv4(address: string) {
  const [a,b] = address.split(".").map(Number);
  return isIP(address) === 4 && a !== 0 && a !== 10 && a !== 127 && a < 224 && !(a===169&&b===254) && !(a===172&&b>=16&&b<=31) && !(a===192&&(b===168||b===0)) && !(a===100&&b>=64&&b<=127) && !(a===198&&(b===18||b===19));
}
// DNS is checked inside the connection lookup, so redirects and DNS changes
// cannot turn a public feed URL into a request to a private network.
export async function fetchPublicText(value: string, redirects = 0): Promise<string> {
  const url = publicFeedUrl(value);
  return new Promise((resolve, reject) => {
    const request = https.get(url, { family:4, headers:{"User-Agent":"DailyPulse/1.0 (RSS reader)",Accept:"application/rss+xml, application/atom+xml, text/html, application/xml"}, lookup(hostname, _options, callback) {
      lookup(hostname,{family:4}).then(({address,family})=>{
        if (!publicIPv4(address)) return callback(new Error("Private network addresses are not allowed."),"",4);
        callback(null,address,family);
      }).catch(error=>callback(error,"",4));
    } }, response => {
      const status=response.statusCode ?? 500;
      if (status>=300&&status<400&&response.headers.location) {
        response.resume();
        if(redirects>=3) return reject(new Error("Too many feed redirects."));
        fetchPublicText(new URL(response.headers.location,url).href,redirects+1).then(resolve,reject); return;
      }
      if(status!==200){response.resume();reject(new Error(`Source returned HTTP ${status}.`));return;}
      let size=0; const chunks:Buffer[]=[];
      response.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>3_000_000){request.destroy(new Error("Source exceeds 3 MB limit."));return;}chunks.push(chunk);});
      response.on("end",()=>resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error",reject);
    });
    const timeout=setTimeout(()=>request.destroy(new Error("Source timed out.")),10_000);
    request.on("close",()=>clearTimeout(timeout)); request.on("error",reject);
  });
}
