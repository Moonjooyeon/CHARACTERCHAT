import {portraitVariants} from './portrait-variants';
export const cardPortraitSizes='(max-width: 600px) calc((100vw - 54px) / 2), (max-width: 900px) calc((100vw - 100px) / 3), (max-width: 1200px) calc((100vw - 125px) / 4), 246px';
/** Only approved public catalog covers have derivatives. Protected assets are never transformed here. */
export function portraitImageProps(src:string,sizes=cardPortraitSizes){const item=portraitVariants[src as keyof typeof portraitVariants];if(!item)return {};return {srcSet:[...item.variants.map(v=>`${v.src} ${v.width}w`),`${src} ${item.width}w`].join(', '),sizes};}
