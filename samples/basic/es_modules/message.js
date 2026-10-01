import { add } from './math.mjs';

export const helperUrl = import.meta.url;

export default function createMessage(name) {
    return `${name}: imported module result = ${add(10, 14)}`;
}
