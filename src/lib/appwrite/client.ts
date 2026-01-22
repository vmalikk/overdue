import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint("https://nyc.cloud.appwrite.io/v1")
    .setProject("6971c59b000e2766561b");

const account = new Account(client);

export { client, account };
