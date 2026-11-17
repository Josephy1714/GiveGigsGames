
function animate() {
    requestAnimationFrame(animate);
    
    // Cap delta at 0.1s to prevent giant jumps when switching tabs
    const delta = Math.min(clock.getDelta(), 0.1);
    
    // Slowly rotate the camera slightly for dynamic look or keep stable
    if (scene) {
        if (isPlaying) {
            roundTime += delta * 1000;
            updatePhysics(delta);
        }
        renderer.render(scene, camera);
    }
}
