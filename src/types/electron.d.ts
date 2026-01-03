export { };

declare global {
    interface Window {
        isElectron?: boolean;
        platform?: {
            os: string;
            isProd: boolean;
            isElectron: boolean;
            version: string;
        };
        electron?: {
            // Add other electron API methods here if needed
            [key: string]: any;
        };
    }
}
