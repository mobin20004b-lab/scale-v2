import nextConfig from "eslint-config-next";

export default [
    {
        ignores: [".next/**", "node_modules/**"],
    },
    ...nextConfig.rules ? [nextConfig] : [], // This is a bit hacky for Next.js Flat Config support
];
