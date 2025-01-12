import { v2 as clodinary } from 'cloudinary'

const deleteOldImage = async (imageUrl) => {
    try {
        if (!imageUrl) return null
        const imagePublicId = imageUrl.split("/").pop(imageUrl.length - 1);
        console.log(`imageId: ${imagePublicId}`);
        const destroyImage = await clodinary.uploader.destroy(imagePublicId)
        if (destroyImage) console.log("Image Delete Successfully");
    } catch (error) {
        console.error(error);
    }
}

export {deleteOldImage}