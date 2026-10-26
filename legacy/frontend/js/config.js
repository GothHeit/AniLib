export const API_URL = 'http://127.0.0.1:8000';

export function nsfwEnabled() {
    return localStorage.getItem("nsfw") !== "0";
}

export function setNsfwEnabled(on) {
    localStorage.setItem("nsfw", on ? "1" : "0");
}
