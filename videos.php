<?php
declare(strict_types=1);

$pageTitle = 'Videos';
$activePage = 'videos';
include __DIR__ . '/includes/layout-start.php';
?>
<section class="hero">
  <p class="eyebrow">Videos</p>
  <h1>A dedicated space for highlights, interviews, and analysis.</h1>
  <p class="intro">
    This layout works well for featured clips, post-race reactions, and short-form video collections.
  </p>
</section>

<section class="content-grid">
  <article class="content-card">
    <h2>Featured Clip</h2>
    <p>Place your primary video story here and pair it with a concise supporting description.</p>
  </article>
  <article class="content-card">
    <h2>Recent Uploads</h2>
    <p>Use secondary cards for interview segments, technical explainers, or race weekend breakdowns.</p>
  </article>
</section>
<?php include __DIR__ . '/includes/layout-end.php'; ?>
