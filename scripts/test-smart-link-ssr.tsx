import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SmartLink } from '../src/components/Common/SmartLink';
import { buildArticlePath, buildFilmPath, buildCategoryPath } from '../src/utils/entityPaths';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
  }
};

const runTests = () => {
  console.log('Running SmartLink SSR Tests...\n');

  const article = { id: 'art-1', slug: 'review-dune-2' };
  const film = { id: 'film-1', slug: 'sinners-2025', title: 'Sinners' };

  const render = (node: React.ReactNode) =>
    renderToString(React.createElement(MemoryRouter, null, node));

  // Article card link
  const articleHtml = render(
    <article id="card-art-1">
      <SmartLink to={buildArticlePath(article)} className="block group">
        <h3>Judul Artikel</h3>
      </SmartLink>
    </article>
  );
  assert(
    articleHtml.includes('href="/artikel/review-dune-2"'),
    'SSR renders a real anchor with the article path'
  );
  assert(articleHtml.includes('Judul Artikel'), 'SSR keeps the title text inside the anchor');
  assert(
    articleHtml.includes('<article id="card-art-1"'),
    'SSR keeps the <article> outer element with its id'
  );
  assert(
    articleHtml.includes('target="_blank"') === false,
    'internal links do not open in a new tab'
  );

  // Film card link
  const filmHtml = render(
    <SmartLink to={buildFilmPath(film)} className="block">
      Sinners (2025)
    </SmartLink>
  );
  assert(
    filmHtml.includes('href="/film/sinners-2025"'),
    'SSR renders a real anchor with the film path'
  );

  // Category link
  const categoryHtml = render(
    <SmartLink to={buildCategoryPath('movies', 'reviews')} className="block">
      Reviews
    </SmartLink>
  );
  assert(
    categoryHtml.includes('href="/kategori/movies/reviews"'),
    'SSR renders a real anchor with the category path'
  );

  // Nested-control pattern: no <button> inside the anchor
  const nestedHtml = render(
    <article className="relative">
      <h3>
        <SmartLink to={buildFilmPath(film)} className="after:absolute after:inset-0">
          Sinners
        </SmartLink>
      </h3>
      <button type="button" className="relative z-10">
        Ulas
      </button>
    </article>
  );
  const anchorStart = nestedHtml.indexOf('<a ');
  const anchorEnd = nestedHtml.indexOf('</a>');
  const anchorContent = anchorStart >= 0 && anchorEnd > anchorStart
    ? nestedHtml.slice(anchorStart, anchorEnd)
    : '';
  assert(
    anchorContent.includes('<button') === false,
    'no <button> is nested inside the anchor'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
