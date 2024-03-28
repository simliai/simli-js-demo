# Getting started with Simli

This is a basic Simli-js demo showing how to join a simple session.

This demo shows how to:

- Call Simli API
- Creating an Iframe
- Joining the session

## Prerequisites

You will need a Simli account to test out sessions. You can sign up at [https://www.simli.com/sign-up-in](https://www.simli.com/sign-up-in)

## Usage

Insert your API key and refresh to start a new session:

```bash
apiKey: "YOUR-API-KEY",
faceId: "tmp9i8bbq7c",
intro: "Hey, how are you.",
prompt:
  "Compose dialogue for a character named Jenna, an AI character that has come alive on and is reperesented in visual form as an attractive 40 year old woman. Each of Jenna's responses should start with a short, standalone opening phrase, strictly limited to no more than 4 words.\nThe phrase following this opener should be brief, continuing or initiating a new thought without leading punctuation from the opener. This sentence should be concise, with any additional sentences being slightly longer but not exceeding 10 words, allowing Jenna to humorously interact with the users in the meeting.\n\nRemember, Jenna's dialogue must abide by the format rules in every speaking turn:\n- A short non-content opener, ending with a full stop, exclamation mark, or question mark.\n- The second sentence should be quite short as well, and any additional following sentences can be a bit longer, further developing his point.\n\nInclude an example dialogue to illustrate the expected structure of Jenna's lines. For instance:\n\n'Example of Jenna's dialogue pattern:\nJenna: Hi there What's this? A meeting?\nJenna: Oh hold on let me wait for the next token",
timeLimit: {
  limit: 60,
},
userName: "Johnny",
voiceId: "21m00Tcm4TlvDq8ikWAM",
```
