/**
 * Calls the configured AI vision endpoint to generate a text description of a photo.
 * Returns the description string, or null if the service is unavailable or returns an error.
 *
 * Requires VITE_AI_ENDPOINT environment variable to be set.
 */
export async function describePhoto(file) {
  const endpoint = import.meta.env.VITE_AI_ENDPOINT;
  if (!endpoint) return null;

  try {
    // Convert file to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        mimeType: file.type,
        prompt: 'Describe the physical appearance of the person in this photo. Include observable attributes such as approximate age, clothing color and style, hair style and color, and any other visible physical features. Do not make inferences about identity, ethnicity, or personal information.'
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.description || data.text || data.content || null;
  } catch {
    return null;
  }
}
