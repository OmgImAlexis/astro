import outdent from 'outdent';
import {default as torrents} from './testdata';

const generateAtomFeed = () => {
    let xml = '';
    try {
        xml += outdent`
    <?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <atom:link href="https://ubuntu.com/rss" rel="self" type="application/rss+xml" />
        <title>Ubuntu RSS</title>
        <description>Ubuntu torrents feed</description>
        <link>https://ubuntu.com/</link>
        <language>en-us</language>
        <lastBuildDate>Tue, 30 May 2017 10:51:30 -0400</lastBuildDate>`;
        torrents.forEach(t => {
            xml += `
    <item>
        <title>${t.title}</title>
        <description>${t.description}</description>
        <pubDate>${t.pubdate}</pubDate>
        <enclosure url="${t.enclosure.url}" type="${t.enclosure.type}" length="${t.enclosure.length}" />
    </item>`;
        });
        xml += outdent`

        </channel>
        </rss>
        `;
        return Promise.resolve(xml);
    } catch (err) {
        return Promise.reject(err);
    }
};

const generateTorrentNamespacedFeed = () => {
    let xml = '';
    try {
        xml += outdent`
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:torrent="http://xmlns.ezrss.it/0.1/">
        <channel>
            <title>Ubuntu RSS</title>
            <description>Ubuntu torrents feed</description>
            <link>https://ubuntu.com/</link>
            <language>en-us</language>
            <lastBuildDate>Tue, 30 May 2017 10:51:30 -0400</lastBuildDate>
        `;
        torrents.forEach(t => {
            xml += `
    <item>
        <title>${t.title}</title>
        <category>${t.category}</category>
        <pubDate>${t.pubdate}</pubDate>
        <torrent:contentLength>${t.enclosure.length}</torrent:contentLength>
        <torrent:seeds>${t.seeds}</torrent:seeds>
        <torrent:peers>${t.peers}</torrent:peers>
        <enclosure url="${t.enclosure.url}" type="${t.enclosure.type}" length="${t.enclosure.length}" />
    </item>`;
        });
        xml += outdent`

        </channel>
        </rss>
        `;
        return Promise.resolve(xml);
    } catch (err) {
        return Promise.reject(err);
    }
};

const generateTorrentFeed = () => {
    let xml = '';
    try {
        xml += outdent`
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:torrent="http://xmlns.ezrss.it/0.1/">
        <channel>
            <title>Ubuntu RSS</title>
            <description>Ubuntu torrents feed</description>
            <link>https://ubuntu.com/</link>
            <language>en-us</language>
            <lastBuildDate>Tue, 30 May 2017 10:51:30 -0400</lastBuildDate>
        `;
        torrents.forEach(t => {
            xml += `
    <torrent xmlns="http://xmlns.ezrss.it/0.1/">
        <title>${t.title}</title>
        <category>${t.category}</category>
        <pubDate>${t.pubdate}</pubDate>
        <contentLength>${t.enclosure.length}</contentLength>
        <seeds>${t.seeds}</seeds>
        <peers>${t.peers}</peers>
        <enclosure url="${t.enclosure.url}" type="${t.enclosure.type}" length="${t.enclosure.length}" />
    </torrent>`;
        });
        xml += outdent`

        </channel>
        </rss>
        `;
        return Promise.resolve(xml);
    } catch (err) {
        return Promise.reject(err);
    }
};

const generateMixedTorrentFeed = () => {
    let xml = '';
    try {
        xml += outdent`
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:torrent="http://xmlns.ezrss.it/0.1/">
        <channel>
            <title>Ubuntu RSS</title>
            <description>Ubuntu torrents feed</description>
            <link>https://ubuntu.com/</link>
            <language>en-us</language>
            <lastBuildDate>Tue, 30 May 2017 10:51:30 -0400</lastBuildDate>
        `;
        torrents.forEach(t => {
            xml += `
    <torrent>
        <title>${t.title}</title>
        <category>${t.category}</category>
        <pubDate>${t.pubdate}</pubDate>
        <contentLength>${t.enclosure.length}</contentLength>
        <seeds>${t.seeds}</seeds>
        <peers>${t.peers}</peers>
        <enclosure url="${t.enclosure.url}" type="${t.enclosure.type}" length="${t.enclosure.length}" />
    </torrent>
    <item>
        <title>${t.title}</title>
        <category>${t.category}</category>
        <pubDate>${t.pubdate}</pubDate>
        <description>Lorem ipsum dolor...</description>
    </item>`;
        });
        xml += outdent`

        </channel>
        </rss>
        `;
        return Promise.resolve(xml);
    } catch (err) {
        return Promise.reject(err);
    }
};

export {generateAtomFeed, generateTorrentNamespacedFeed, generateTorrentFeed, generateMixedTorrentFeed};
