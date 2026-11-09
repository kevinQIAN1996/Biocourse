'use strict';

(() => {
  const picker = document.querySelector('#choose-courses');
  const summary = picker.querySelector('summary');
  const book = document.querySelector('#courseBook');
  const chapter = document.querySelector('#courseChapter');
  const section = document.querySelector('#courseSection');
  const search = document.querySelector('#search');
  const clear = document.querySelector('#clearFilters');
  const count = document.querySelector('#resultCount');
  const empty = document.querySelector('#empty');
  const path = document.querySelector('#coursePath');
  const status = document.querySelector('#curriculumStatus');
  const cards = [...document.querySelectorAll('#catalogResults .card')];
  let curriculum;
  let loading;

  function setOptions(select, placeholder, entries = []) {
    select.replaceChildren(new Option(placeholder, ''), ...entries.map(([id, label]) => new Option(label, id)));
  }

  function updateSections() {
    const sections = curriculum?.sections[book.value]?.[chapter.value] || {};
    setOptions(section, '本章全部小节', Object.entries(sections).map(([n, title]) => [n, '第' + n + '节 · ' + title]));
    section.closest('label').hidden = !chapter.value;
  }

  function updateChapters() {
    const chapters = curriculum?.chapters[book.value] || {};
    setOptions(chapter, '本册全部章节', Object.entries(chapters).map(([n, title]) => [n, '第' + n + '章 · ' + title]));
    chapter.closest('label').hidden = !book.value;
    updateSections();
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const chapterKey = book.value + '-' + chapter.value;
    let visible = 0;

    for (const card of cards) {
      const matches = (!book.value || card.dataset.category === book.value) &&
        (!chapter.value || card.dataset.chapter === chapterKey) &&
        (!section.value || card.dataset.sections.split(',').includes(section.value)) &&
        (!query || card.dataset.search.toLocaleLowerCase().includes(query));
      card.hidden = !matches;
      if (matches) visible++;
    }

    empty.hidden = visible > 0;
    clear.hidden = !query && !book.value;
    count.textContent = visible === cards.length
      ? '显示全部 ' + visible + ' 个主题'
      : '找到 ' + visible + ' / ' + cards.length + ' 个主题';

    const bookLabel = book.value ? book.selectedOptions[0].text.split(' · ')[0] : '';
    path.textContent = [
      bookLabel,
      chapter.value && '第' + chapter.value + '章',
      section.value && '第' + section.value + '节'
    ].filter(Boolean).join(' / ') || '教材 → 章 → 节';
  }

  async function loadCurriculum() {
    if (curriculum || loading) return;
    loading = true;
    book.disabled = true;
    status.hidden = false;
    status.textContent = '正在加载教材目录…';

    try {
      const response = await fetch('curriculum.json', {signal: AbortSignal.timeout(8000)});
      if (!response.ok) throw new Error('教材目录不可用');
      const data = await response.json();
      if (!data.books || !data.chapters || !data.sections) throw new Error('教材目录格式错误');

      const order = ['cell', 'gene', 'physiology', 'eco', 'biotech'];
      const books = Object.entries(data.books).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
      setOptions(book, '全部教材', books);
      curriculum = data;
      book.disabled = false;
      status.hidden = true;
    } catch {
      status.textContent = '暂时无法载入教材目录。可先搜索课题，或收起后重新打开。';
    } finally {
      loading = false;
    }
  }

  picker.addEventListener('toggle', () => { if (picker.open) loadCurriculum(); });
  book.addEventListener('change', () => { updateChapters(); render(); });
  chapter.addEventListener('change', () => { updateSections(); render(); });
  section.addEventListener('change', render);
  search.addEventListener('input', render);
  clear.addEventListener('click', () => {
    const hadSearch = search.value.trim();
    search.value = '';
    book.value = '';
    updateChapters();
    render();
    (hadSearch ? search : summary).focus({preventScroll: true});
  });

  function openFromLink() {
    if (location.hash === '#choose-courses') {
      picker.open = true;
      loadCurriculum();
    }
  }

  addEventListener('hashchange', openFromLink);
  openFromLink();
})();
