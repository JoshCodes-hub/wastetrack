import * as tf from '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'

let model: mobilenet.MobileNet | null = null

async function getModel() {
  if (!model) {
    await tf.ready()
    model = await mobilenet.load()
  }
  return model
}

const wasteMapping: Record<string, string> = {
  'garbage truck': 'mixed_waste',
  'garbage': 'mixed_waste',
  'plastic bag': 'plastic',
  'banana': 'food_waste',
  'apple': 'food_waste',
  'orange': 'food_waste',
  'can': 'metal',
  'tin can': 'metal',
  'water bottle': 'plastic',
  'bottle': 'plastic',
  'pop bottle': 'plastic',
  'computer keyboard': 'electronic',
  'mouse': 'electronic',
  'monitor': 'electronic',
  'paper': 'paper',
  'book': 'paper',
  'magazine': 'paper',
  'cardboard': 'paper',
  'glass': 'glass',
  'wine glass': 'glass',
  'drinking glass': 'glass',
}

export async function classifyWasteType(imageFile: File): Promise<{ wasteType: string; label: string; confidence: number }> {
  try {
    const img = new Image()
    const url = URL.createObjectURL(imageFile)
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })
    const m = await getModel()
    const predictions = await m.classify(img)
    URL.revokeObjectURL(url)
    if (predictions.length > 0) {
      const top = predictions[0]
      const confidence = top.probability
      for (const [keyword, wasteType] of Object.entries(wasteMapping)) {
        if (top.className.toLowerCase().includes(keyword)) {
          return { wasteType, label: top.className, confidence }
        }
      }
      return { wasteType: 'other', label: top.className, confidence }
    }
    return { wasteType: 'other', label: 'unknown', confidence: 0 }
  } catch {
    return { wasteType: 'mixed_waste', label: 'unknown', confidence: 0 }
  }
}
