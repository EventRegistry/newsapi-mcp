# NewsAPI MCP

An MCP server that lets AI tools search news articles, events and sources from
NewsAPI.ai (Event Registry). It runs either on the user's machine or as a
service hosted by Event Registry.

## Deployments

**Local server**:
The npm package run on the user's machine over stdio, authenticated by the user's login or an API key.
_Avoid_: CLI server, npx server

**Hosted server**:
The Event Registry-run service that MCP clients reach over HTTP by URL, authenticated by the user's login.
_Avoid_: remote server, cloud server

**Public URL**:
The address at which MCP clients reach the hosted server.
_Avoid_: endpoint, server URL

## Identity

**Event Registry account**:
A user's identity at Event Registry, which owns their API usage and token quota.
_Avoid_: NewsAPI account, ER user

**Login**:
The user signing in through the Event Registry auth server so a server can call the API on their behalf; the MCP client runs it for the hosted server, the package itself for the local server.
_Avoid_: sign-up, registration

**Linked account**:
A login identity that is attached to an Event Registry account; only linked identities can make API calls.
_Avoid_: connected account

**API key**:
A static secret tied to an Event Registry account; the local server's alternative to a login.
_Avoid_: token, access token

## Reporting

**Source material**:
Tool output the model reads to write its report but the user is not meant to see: article bodies, metadata and intermediate results.
_Avoid_: raw data, context

**Report**:
The model's answer to the user: key points in its own words, each with a link to its article.
_Avoid_: summary, output

## Distribution

**News skill**:
The `/news` research workflow and its report templates that guide an AI tool's use of the tools.
_Avoid_: prompt, template pack
