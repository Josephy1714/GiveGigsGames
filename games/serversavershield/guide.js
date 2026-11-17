// Keep this standalone guide independent of the retired site-wide layout script.
document.querySelectorAll('.read-more-btn').forEach((button, index) => {
    const details = button.closest('.entity-card')?.querySelector('.entity-details');
    if (!details) return;
    details.id = `guide-details-${index}`;
    details.hidden = true;
    button.setAttribute('aria-controls', details.id);
    button.setAttribute('aria-expanded', 'false');
});
function toggleDetails(button) {
    const details = button.closest('.entity-card')?.querySelector('.entity-details');
    if (!details) return;
    details.hidden = !details.hidden;
    button.setAttribute('aria-expanded', String(!details.hidden));
    button.textContent = details.hidden ? 'Read More' : 'Read Less';
}
