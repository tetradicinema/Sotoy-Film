import { FilmItem, Article, SectionConfig } from '../src/types';
import {
  collectGenreOptions,
  filmMatchesGenre,
  getFilmGenreList,
  normalizeGenreName,
  resolveFilmSectionGenre,
} from '../src/utils/filmGenres';
import {
  buildFilmPickerSelection,
  getFilmPickerRow,
  getHeroToWatch,
  resolveFilmDbSection,
  resolveHomeFilmIndonesia,
  resolveHomeFilmRecs,
  resolveHomeStreaming,
  searchFilmPickerItems,
} from '../src/utils/filmSections';
import { resolveConfigArticles, resolveConfigFilms } from '../src/utils/homepageConfigHelper';
import { DEFAULT_POSTER } from '../src/data/mockData';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`OK ${message}`);
  } else {
    failed++;
    console.error(`FAIL ${message}`);
  }
};

const assertEquals = (actual: any, expected: any, message: string) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(same, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
};

const createFilm = (overrides: Partial<FilmItem> = {}): FilmItem => ({
  id: 'film-default',
  title: 'Test Film',
  type: 'movie',
  year: 2024,
  poster: '',
  backdrop: '',
  synopsis: '',
  director: '',
  cast: [],
  genres: [],
  tags: [],
  skorSotoy: 5,
  criticsSkorSotoy: 5,
  totalVotes: 0,
  scoreScale: 10,
  whereToWatch: [],
  ...overrides,
});

const NOW = new Date('2026-10-25T00:00:00.000Z');

const films: FilmItem[] = [
  createFilm({
    id: 'horror-legacy-id',
    title: 'Legacy Horror',
    year: 2020,
    genres: ['27'],
    skorSotoy: 9,
    totalVotes: 20,
  }),
  createFilm({
    id: 'horror-name',
    title: 'Named Horror',
    year: 2021,
    genres: ['Horror'],
    tags: ['A24'],
    skorSotoy: 7,
    totalVotes: 4,
  }),
  createFilm({
    id: 'sci-fi',
    title: 'Dune: Part Two',
    originalTitle: 'Dune: Deuxieme Partie',
    year: 2024,
    genres: ['Sci-Fi'],
    skorSotoy: 8,
    totalVotes: 12,
  }),
  createFilm({
    id: 'sci-fi-alias',
    title: 'Arrival',
    year: 2024,
    genres: ['Science-Fiction'],
    skorSotoy: 6,
    totalVotes: 2,
  }),
  createFilm({
    id: 'drama-a24',
    title: 'Past Lives',
    year: 2023,
    genres: ['Drama'],
    tags: ['A24'],
    skorSotoy: 9,
    totalVotes: 30,
  }),
  createFilm({
    id: 'indonesia-horror',
    title: 'Pengabdi Setan',
    year: 2022,
    genres: ['Horror', 'Drama'],
    originCountry: ['ID'],
    whereToWatch: [{ type: 'stream', platform: 'Netflix', badgeColor: '' }],
    skorSotoy: 8,
    totalVotes: 10,
  }),
  createFilm({
    id: 'indonesia-drama',
    title: 'Ada Apa Dengan Cinta',
    year: 2002,
    genres: ['Drama', 'Romance'],
    originCountry: ['ID'],
    whereToWatch: [{ type: 'stream', platform: 'Vidio', badgeColor: '' }],
    skorSotoy: 7,
    totalVotes: 5,
  }),
  createFilm({
    id: 'stream-horror',
    title: 'Streaming Horror',
    year: 2025,
    genres: ['Horror'],
    whereToWatch: [{ type: 'stream', platform: 'Netflix', badgeColor: '' }],
    skorSotoy: 6,
    totalVotes: 8,
  }),
  createFilm({
    id: 'cinema-horror',
    title: 'Cinema Horror',
    year: 2026,
    genres: ['Horror'],
    idReleaseDate: '2026-10-10',
    whereToWatch: [{ type: 'cinema', platform: 'Bioskop', badgeColor: '' }],
    skorSotoy: 7,
    totalVotes: 6,
  }),
];

const runTests = () => {
  console.log('Running Film Section Genre Tests...\n');

  // 1. Alias normalization
  {
    assertEquals(normalizeGenreName('Sci-Fi'), 'Science Fiction', 'normalizeGenreName maps Sci-Fi');
    assertEquals(
      normalizeGenreName('  science-fiction  '),
      'Science Fiction',
      'normalizeGenreName maps Science-Fiction with whitespace'
    );
    assertEquals(normalizeGenreName('SCI FI'), 'Science Fiction', 'normalizeGenreName is case insensitive');
    assertEquals(normalizeGenreName(' horror '), 'Horror', 'normalizeGenreName preserves canonical casing');
  }

  // 2. Legacy TMDB ids
  {
    assertEquals(normalizeGenreName('27'), 'Horror', 'normalizeGenreName maps TMDB id 27');
    assertEquals(normalizeGenreName(878), 'Science Fiction', 'normalizeGenreName maps numeric TMDB id 878');
    assertEquals(
      getFilmGenreList({ genres: ['878', 'sci-fi', 'Horror', ''] }),
      ['Science Fiction', 'Horror'],
      'getFilmGenreList maps legacy ids and dedupes aliases'
    );
  }

  // 3. collectGenreOptions counts and ordering
  {
    const options = collectGenreOptions(films);
    const horror = options.find(option => option.value === 'Horror');
    const scienceFiction = options.find(option => option.value === 'Science Fiction');
    const drama = options.find(option => option.value === 'Drama');

    assert(horror?.count === 5, 'collectGenreOptions counts legacy ids and aliases together');
    assert(scienceFiction?.count === 2, 'collectGenreOptions groups Sci-Fi and Science-Fiction');
    assert(drama?.count === 3, 'collectGenreOptions counts each film once per genre');
    assertEquals(options[0].value, 'Horror', 'collectGenreOptions sorts by count descending');
    assertEquals(
      collectGenreOptions([
        { genres: ['Western'] },
        { genres: ['Action'] },
        { genres: ['Drama'] },
      ]).map(option => option.label),
      ['Action', 'Drama', 'Western'],
      'collectGenreOptions breaks ties alphabetically'
    );
    assert(
      !options.some(option => option.value === ''),
      'collectGenreOptions skips empty genre values'
    );
  }

  // 4. Shared genre matching / effective genre
  {
    assert(filmMatchesGenre(films[2], 'science fiction'), 'filmMatchesGenre compares canonical names');
    assert(!filmMatchesGenre(films[2], 'Horror'), 'filmMatchesGenre rejects other genres');
    assertEquals(
      resolveFilmSectionGenre({ genre: 'Sci-Fi', subCategory: 'reviews' }),
      'Science Fiction',
      'resolveFilmSectionGenre prefers config.genre'
    );
    assertEquals(
      resolveFilmSectionGenre({ subCategory: 'horror' }),
      'Horror',
      'resolveFilmSectionGenre treats a legacy genre subCategory as genre'
    );
    assertEquals(
      resolveFilmSectionGenre({ subCategory: 'reviews' }),
      '',
      'resolveFilmSectionGenre ignores article sub-categories'
    );
  }

  // 5. resolveConfigFilms auto genre filter
  {
    const result = resolveConfigFilms(
      films,
      { sourceType: 'auto', genre: 'Horror', limit: 12 },
      []
    );
    assertEquals(result.length, 5, 'resolveConfigFilms filters by genre');
    assert(
      result.every(film => filmMatchesGenre(film, 'Horror')),
      'resolveConfigFilms only returns genre matches'
    );
  }

  // 6. resolveHomeFilmRecs genre filter
  {
    const result = resolveHomeFilmRecs(films, { sourceType: 'auto', genre: 'Horror' });
    assertEquals(result.length, 5, 'resolveHomeFilmRecs applies the genre filter');
    assert(
      result.every(film => filmMatchesGenre(film, 'Horror')),
      'resolveHomeFilmRecs returns only genre matches'
    );
  }

  // 7. hero_to_watch genre filter
  {
    const result = getHeroToWatch(films, { sourceType: 'auto', genre: 'science-fiction' });
    assertEquals(result.length, 2, 'getHeroToWatch applies the genre filter');
    assert(
      result.every(film => filmMatchesGenre(film, 'Science Fiction')),
      'getHeroToWatch resolves genre aliases'
    );
  }

  // 8. resolveFilmDbSection genre filter
  {
    const result = resolveFilmDbSection('fd_fans_favourite', films, {
      sourceType: 'auto',
      genre: 'Horror',
      minVotes: 0,
      limit: 12,
    });
    assertEquals(result.length, 5, 'resolveFilmDbSection applies the genre filter');
    assert(
      result.every(film => filmMatchesGenre(film, 'Horror')),
      'resolveFilmDbSection returns only genre matches'
    );
  }

  // 9. resolveHomeStreaming genre filter
  {
    const result = resolveHomeStreaming(films, { sourceType: 'auto', genre: 'Horror' });
    assertEquals(result.length, 2, 'resolveHomeStreaming applies the genre filter over streaming films');
    assert(
      result.every(film => filmMatchesGenre(film, 'Horror')),
      'resolveHomeStreaming keeps only genre matches'
    );
  }

  // 10. resolveHomeFilmIndonesia genre filter
  {
    const result = resolveHomeFilmIndonesia(films, { sourceType: 'auto', genre: 'Horror' });
    assertEquals(result.length, 1, 'resolveHomeFilmIndonesia applies the genre filter');
    assertEquals(result[0].id, 'indonesia-horror', 'resolveHomeFilmIndonesia keeps the Indonesian horror film');
  }

  // 11. Legacy subCategory equal to a genre
  {
    const result = resolveConfigFilms(
      films,
      { sourceType: 'auto', subCategory: 'horror', limit: 12 },
      []
    );
    assertEquals(result.length, 5, 'legacy subCategory genre is applied to film sections');
  }

  // 12. Legacy article sub-category ignored for films (resolver)
  {
    const result = resolveConfigFilms(
      films,
      { sourceType: 'auto', subCategory: 'reviews', limit: 12 },
      []
    );
    assertEquals(result.length, 9, 'article sub-category does not filter films out');
  }

  // 13. Legacy article sub-category ignored by resolveFilmDbSection
  {
    const result = resolveFilmDbSection('fd_fans_favourite', films, {
      sourceType: 'auto',
      subCategory: 'news',
      minVotes: 0,
      limit: 12,
    });
    assertEquals(result.length, 9, 'resolveFilmDbSection ignores legacy article sub-categories');
  }

  // 14. resolveCuratedFilms hasFilters ignores article sub-categories
  {
    const featured = createFilm({
      id: 'featured-only',
      title: 'Featured Only',
      year: 2019,
      genres: ['Drama'],
      featuredRecommendation: true,
      skorSotoy: 5,
      totalVotes: 1,
    });
    const highScore = createFilm({
      id: 'high-score',
      title: 'High Score',
      year: 2025,
      genres: ['Horror'],
      skorSotoy: 10,
      totalVotes: 100,
    });
    const result = resolveHomeFilmRecs([highScore, featured], {
      sourceType: 'auto',
      subCategory: 'reviews',
    });
    assertEquals(result[0].id, 'featured-only', 'article sub-category falls through to editorial defaults');
  }

  // 15. Tag still matches tags and genres
  {
    const byGenre = resolveConfigFilms(
      films,
      { sourceType: 'auto', tag: 'sci-fi', limit: 12 },
      []
    );
    assertEquals(byGenre.length, 2, 'tag filter still matches canonical genres');
    const byTag = resolveConfigFilms(
      films,
      { sourceType: 'auto', tag: 'A24', limit: 12 },
      []
    );
    assertEquals(byTag.length, 2, 'tag filter still matches film tags');
  }

  // 16. Limit respected
  {
    const result = resolveHomeFilmRecs(films, {
      sourceType: 'auto',
      genre: 'Horror',
      limit: 1,
    });
    assertEquals(result.length, 1, 'genre filter respects the configured limit');
  }

  // 17. Manual mode unchanged
  {
    const result = resolveFilmDbSection('fd_editors_pick', films, {
      sourceType: 'manual',
      itemIds: ['drama-a24', 'horror-legacy-id'],
      genre: 'Horror',
      limit: 12,
    });
    assertEquals(
      result.map(film => film.id),
      ['drama-a24', 'horror-legacy-id'],
      'manual mode keeps saved order and ignores genre filters'
    );
  }

  // 18. Manual mode with unknown ids falls back to defaults
  {
    const result = resolveHomeFilmRecs(films, {
      sourceType: 'manual',
      itemIds: ['does-not-exist'],
    });
    assert(result.length > 0, 'manual mode with unknown ids falls back to defaults');
    assertEquals(result[0].id, 'drama-a24', 'manual fallback uses the editorial default order');
  }

  // 19. Article resolver unchanged
  {
    const articles: Article[] = [
      {
        id: 'article-reviews',
        title: 'Review Film',
        category: 'movies',
        subCategory: 'reviews',
        tags: ['review'],
        publishedAt: '2026-01-01',
        views: 1,
        skorSotoy: 8,
      } as Article,
      {
        id: 'article-news',
        title: 'News Film',
        category: 'movies',
        subCategory: 'news',
        tags: ['news'],
        publishedAt: '2026-01-02',
        views: 2,
        skorSotoy: 7,
      } as Article,
    ];
    const result = resolveConfigArticles(
      articles,
      { sourceType: 'auto', subCategory: 'reviews' } as SectionConfig,
      []
    );
    assertEquals(result.map(article => article.id), ['article-reviews'], 'article resolver still filters by sub-category');
  }

  // 20. Type accepts genre while keeping subCategory
  {
    const config: SectionConfig = { sourceType: 'auto', genre: 'Horror', subCategory: 'reviews' };
    assert(config.genre === 'Horror' && config.subCategory === 'reviews', 'SectionConfig keeps genre and subCategory');
  }

  // ---------------------------------------------------------------------------
  // Manual picker helpers
  // ---------------------------------------------------------------------------

  const pickerFilms: FilmItem[] = [
    createFilm({
      id: 'picker-dune',
      title: 'Dune: Part Two',
      originalTitle: 'Dune: Deuxieme Partie',
      year: 2024,
      poster: 'https://example.com/dune.jpg',
    }),
    createFilm({
      id: 'picker-arrival',
      title: 'Arrival',
      originalTitle: 'L Arrivee',
      year: 2016,
      type: 'series',
    }),
    createFilm({
      id: 'picker-spirited',
      title: 'Spirited Away',
      originalTitle: 'Sen to Chihiro no Kamikakushi',
      year: 2001,
      type: 'animation',
    }),
    ...Array.from({ length: 9 }, (_, index) =>
      createFilm({
        id: `picker-extra-${index}`,
        title: `Film Tambahan ${index}`,
        year: 2024,
      })
    ),
  ];

  // 21. Search by title
  {
    const result = searchFilmPickerItems(pickerFilms, 'dune');
    assertEquals(result.map(film => film.id), ['picker-dune'], 'picker search matches the title');
  }

  // 22. Search by original title
  {
    const result = searchFilmPickerItems(pickerFilms, 'chihiro');
    assertEquals(result.map(film => film.id), ['picker-spirited'], 'picker search matches the original title');
  }

  // 23. Search by year
  {
    const result = searchFilmPickerItems(pickerFilms, '2024');
    assert(result.length === 8, 'picker search by year returns matches capped at 8');
    assert(
      result.every(film => film.year === 2024),
      'picker search by year only returns films from that year'
    );
  }

  // 24. Search by part of the title plus the year
  {
    const result = searchFilmPickerItems(pickerFilms, 'dune 2024');
    assertEquals(result.map(film => film.id), ['picker-dune'], 'picker search combines title and year tokens');
  }

  // 25. Search limit
  {
    const result = searchFilmPickerItems(pickerFilms, 'film');
    assertEquals(result.length, 8, 'picker search respects the 8 result limit');
    assertEquals(searchFilmPickerItems(pickerFilms, 'film', 3).length, 3, 'picker search accepts a custom limit');
  }

  // 26. Row fields and type labels
  {
    const movieRow = getFilmPickerRow(pickerFilms[0]);
    const seriesRow = getFilmPickerRow(pickerFilms[1]);
    const animationRow = getFilmPickerRow(pickerFilms[2]);
    assertEquals(
      { id: movieRow.id, title: movieRow.title, year: movieRow.year, typeLabel: movieRow.typeLabel },
      { id: 'picker-dune', title: 'Dune: Part Two', year: 2024, typeLabel: 'Movie' },
      'picker row exposes id, title, year and type label'
    );
    assertEquals(seriesRow.typeLabel, 'Series', 'picker row labels series');
    assertEquals(animationRow.typeLabel, 'Animation', 'picker row labels animation');
  }

  // 27. Poster fallback
  {
    assertEquals(getFilmPickerRow(pickerFilms[0]).poster, 'https://example.com/dune.jpg', 'picker row keeps a valid poster');
    assertEquals(getFilmPickerRow(pickerFilms[1]).poster, DEFAULT_POSTER, 'picker row falls back to DEFAULT_POSTER');
  }

  // 28. Selection with missing ids
  {
    const selection = buildFilmPickerSelection(pickerFilms, [
      'picker-dune',
      'missing-film-id',
      'picker-spirited',
    ]);
    assertEquals(selection.length, 3, 'selection keeps every saved id');
    assert(selection[0].found && selection[0].row?.title === 'Dune: Part Two', 'selection builds a row for found ids');
    assert(!selection[1].found && selection[1].row === null, 'selection flags missing ids');
    assertEquals(selection[1].id, 'missing-film-id', 'selection keeps the missing id for display');
    assertEquals(selection[2].id, 'picker-spirited', 'selection preserves saved order');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
