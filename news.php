<?php
declare(strict_types=1);

$pageTitle = 'News';
$activePage = 'news';
include __DIR__ . '/includes/layout-start.php';
?>
<section class="hero">
  <p class="eyebrow">News</p>
  <h1>Keep race headlines and updates clear and easy to scan.</h1>
  <p class="intro">
    Use this section for top stories, transfer rumors, paddock developments, and concise editorial summaries.
  </p>
</section>

<section class="content-grid">
  <article class="content-card">
    <h2>Top Story</h2>
    <p>Feature the most important article of the day with enough space for a short, high-impact summary.</p>
  </article>
  <article class="content-card">
    <h2>More Headlines</h2>
    <p>List supporting stories here while keeping the overall experience minimal and visually consistent.</p>
  </article>
</section>
<?php include __DIR__ . '/includes/layout-end.php'; ?>
