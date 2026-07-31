"""
KrishiSearch Search Service
Searches 5 agricultural sources in parallel.
Returns reranked results for any farming query, any location, any crop.
"""
import asyncio
import httpx
import os
import logging
from dataclasses import dataclass, field
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

TIMEOUT = 8


@dataclass
class SearchResult:
    url:       str
    title:     str
    excerpt:   str
    source:    str
    favicon:   str = ""
    score:     float = 0.0
    full_text: str = ""


class SearchService:

    async def _tavily(self, query: str) -> list:
        key = os.getenv("TAVILY_API_KEY", "")
        if not key:
            return []
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as c:
                res = await c.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key":        key,
                        "query":          f"farming agriculture {query}",
                        "search_depth":   "advanced",
                        "include_domains": [
                            "icar.org.in", "vikaspedia.in", "fao.org",
                            "agrifarming.in", "krishisewa.com",
                            "extension.umn.edu", "extension.psu.edu",
                            "plantvillage.psu.edu", "agriculture.com",
                            "rhs.org.uk", "krishijagran.com",
                        ],
                        "max_results":         7,
                        "include_raw_content": True,
                    }
                )
            return [
                SearchResult(
                    url=r.get("url", ""),
                    title=r.get("title", ""),
                    excerpt=r.get("content", "")[:400],
                    full_text=r.get("raw_content", r.get("content", ""))[:2000],
                    source="Web",
                    favicon=f"https://www.google.com/s2/favicons?domain={r.get('url','')}&sz=32"
                )
                for r in res.json().get("results", [])
            ]
        except Exception as e:
            logger.warning(f"[Tavily] {e}")
            return []

    async def _semantic_scholar(self, query: str) -> list:
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as c:
                res = await c.get(
                    "https://api.semanticscholar.org/graph/v1/paper/search",
                    params={
                        "query":  f"agriculture crop {query}",
                        "limit":  5,
                        "fields": "title,abstract,year,url"
                    }
                )
            results = []
            for p in res.json().get("data", []):
                if not p.get("abstract"):
                    continue
                url = p.get("url") or \
                      f"https://www.semanticscholar.org/paper/{p.get('paperId', '')}"
                results.append(SearchResult(
                    url=url,
                    title=p.get("title", ""),
                    excerpt=p.get("abstract", "")[:400],
                    full_text=p.get("abstract", ""),
                    source="Research Paper",
                    favicon="https://www.semanticscholar.org/favicon.ico"
                ))
            return results
        except Exception as e:
            logger.warning(f"[SemanticScholar] {e}")
            return []

    async def _vikaspedia(self, query: str) -> list:
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as c:
                res = await c.get(
                    "https://vikaspedia.in/search",
                    params={"q": query, "section": "agriculture"},
                    headers={"User-Agent": "Mozilla/5.0"}
                )
            soup    = BeautifulSoup(res.text, "html.parser")
            results = []
            for item in soup.select(".search-result, article, .result-item")[:4]:
                title_el = item.select_one("h2 a, h3 a, .title a")
                desc_el  = item.select_one("p, .description")
                if not title_el:
                    continue
                href = title_el.get("href", "")
                url  = href if href.startswith("http") else f"https://vikaspedia.in{href}"
                results.append(SearchResult(
                    url=url,
                    title=title_el.get_text(strip=True),
                    excerpt=(desc_el.get_text(strip=True) if desc_el else "")[:400],
                    full_text=(desc_el.get_text(strip=True) if desc_el else ""),
                    source="Vikaspedia",
                    favicon="https://vikaspedia.in/favicon.ico"
                ))
            return results
        except Exception as e:
            logger.warning(f"[Vikaspedia] {e}")
            return []

    async def _pubmed(self, query: str) -> list:
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as c:
                search = await c.get(
                    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
                    params={
                        "db":      "pubmed",
                        "term":    f"{query}[Title/Abstract] AND agriculture[MeSH]",
                        "retmax":  4,
                        "retmode": "json"
                    }
                )
                ids = search.json().get("esearchresult", {}).get("idlist", [])
                if not ids:
                    return []
                summary = await c.get(
                    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
                    params={"db": "pubmed", "id": ",".join(ids), "retmode": "json"}
                )
            data    = summary.json().get("result", {})
            results = []
            for pmid in ids:
                paper = data.get(pmid, {})
                title = paper.get("title", "")
                if not title:
                    continue
                year = str(paper.get("pubdate", ""))[:4]
                results.append(SearchResult(
                    url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    title=title,
                    excerpt=f"Published {year}. {paper.get('source', '')}.",
                    full_text=title,
                    source="PubMed",
                    favicon="https://pubmed.ncbi.nlm.nih.gov/favicon.ico"
                ))
            return results
        except Exception as e:
            logger.warning(f"[PubMed] {e}")
            return []

    async def _fao(self, query: str) -> list:
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as c:
                res = await c.get(
                    "https://www.fao.org/faolex/results/en/",
                    params={"query": query, "type": "All"},
                    headers={"User-Agent": "Mozilla/5.0"}
                )
            soup    = BeautifulSoup(res.text, "html.parser")
            results = []
            for item in soup.select(".result-item, .search-item")[:4]:
                title_el = item.select_one(".title a, h3 a")
                desc_el  = item.select_one(".description, p")
                if not title_el:
                    continue
                href = title_el.get("href", "")
                url  = href if href.startswith("http") else f"https://www.fao.org{href}"
                results.append(SearchResult(
                    url=url,
                    title=title_el.get_text(strip=True),
                    excerpt=(desc_el.get_text(strip=True) if desc_el else "")[:400],
                    full_text=(desc_el.get_text(strip=True) if desc_el else ""),
                    source="FAO",
                    favicon="https://www.fao.org/favicon.ico"
                ))
            return results
        except Exception as e:
            logger.warning(f"[FAO] {e}")
            return []

    def _rerank(self, query: str, results: list) -> list:
        if not results:
            return results
        try:
            if not hasattr(self, "_cross_encoder"):
                from sentence_transformers import CrossEncoder
                self._cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            pairs  = [(query, f"{r.title} {r.excerpt}") for r in results]
            scores = self._cross_encoder.predict(pairs)
            for r, s in zip(results, scores):
                r.score = float(s)
        except Exception:
            try:
                from rank_bm25 import BM25Okapi
                corpus = [f"{r.title} {r.excerpt}".lower().split() for r in results]
                bm25   = BM25Okapi(corpus)
                scores = bm25.get_scores(query.lower().split())
                for r, s in zip(results, scores):
                    r.score = float(s)
            except Exception:
                for i, r in enumerate(results):
                    r.score = float(len(results) - i)
        return sorted(results, key=lambda x: x.score, reverse=True)

    def _deduplicate(self, results: list) -> list:
        seen, out = set(), []
        for r in results:
            if r.url and r.url not in seen:
                seen.add(r.url)
                out.append(r)
        return out

    async def search(self, query: str, max_results: int = 6) -> list:
        tasks = [
            self._tavily(query),
            self._semantic_scholar(query),
            self._vikaspedia(query),
            self._pubmed(query),
            self._fao(query),
        ]
        nested  = await asyncio.gather(*tasks, return_exceptions=True)
        flat    = [r for group in nested if isinstance(group, list) for r in group]
        deduped = self._deduplicate(flat)
        ranked  = self._rerank(query, deduped)
        return ranked[:max_results]


search_service = SearchService()
