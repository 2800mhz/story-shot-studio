function generatePromptsForScene(scene, user, url, visualNote, config, otherParams, aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' = '16:9') {
    const aspectRatioGuide = {
        '16:9': 'widescreen cinematic format (landscape)',
        '4:3': 'classic film format (landscape)',
        '1:1': 'square format (social media)',
        '9:16': 'vertical format (mobile/TikTok/Instagram Stories)',
    };

    const compositionHints = {
        '16:9': 'Use horizontal composition, emphasize width',
        '4:3': 'Balanced composition, classic framing',
        '1:1': 'Centered composition, symmetrical framing',
        '9:16': 'Vertical composition, emphasize height',
    };

    const userMessage = `${visualNote}\n`;
    userMessage += `🎬 ASPECT RATIO: ${aspectRatio} (${aspectRatioGuide[aspectRatio]})\n`;
    userMessage += `COMPOSITION HINT: ${compositionHints[aspectRatio]}\n\n`;

    const prompts = []; // Assuming prompts is defined somewhere
    prompts.map(p => {
        let finalPrompt = p.prompt || '';
        if (!finalPrompt.includes('--ar')) {
            finalPrompt += ` --ar ${aspectRatio}`;
        }
        if (!finalPrompt.includes('--v ')) {
            finalPrompt += ' --v 6';
        }
        return {
            promptText: finalPrompt,
            versions: [finalPrompt],
            aspectRatio: aspectRatio,
        };
    });
}