import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_VITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_VITE_PROJECT_ID!);

const account = new Account(client);

export { client, account };
