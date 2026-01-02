export { };

declare global {
    interface Window {
        isElectron?: boolean;
        electron?: {
            // Add other electron API methods here if needed
            [key: string]: any;
        };
    }
}
