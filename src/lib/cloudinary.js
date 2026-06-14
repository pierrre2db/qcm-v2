const CLOUD_NAME = 'dfaiu57aj'
const UPLOAD_PRESET = 'qcm_upload'

export async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'qcm-v2')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Upload Cloudinary échoué')
  }

  const data = await res.json()
  return data.secure_url
}
