const cannyEdgeDetector = require('canny-edge-detector');
const { Image } = require('image-js');

(async function () {
    const image = await Image.load('./clip/1.jpg');
    const components = image.split();
    components[0].save('cat-red.jpg');
    components[1].save('cat-green.jpg');
    components[2].save('cat-blur.jpg');
})();
