// Only files in our own Cloudinary account, under the huddle/ folder, are accepted as user content.
export const isOwnImage = (url) =>
  typeof url === 'string' &&
  url.length < 500 &&
  url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`) &&
  url.includes('/huddle/');
