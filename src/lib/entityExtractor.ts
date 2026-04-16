const ENTITY_EXTRACTION_PROMPT = `Extract the following details about characters in the scene:
- Age
- Ethnicity
- Clothing
- Physical Features
...`;

function extractEntitiesFromScene(scene) {
    const characters = []; // Extraction logic here

    // Code to extract age, ethnicity, clothing, and physical features into Character objects
    characters.forEach(character => {
        const { age, ethnicity, clothing, physicalFeatures } = character;
        // Populate Character objects with extracted details
        // ...
    });

    return characters;
}