# drivetest.ca availabilities

This CLI tool written in Node.js will log in to [Ontario's driving test booking system](https://drivetest.ca), search for all the available dates and times for all locations within a  given search radius (default is 20km). Once it finds some available times, it will write them to the terminal.

I worked on this tool during some of my spare time because I found it difficult to find open spots for driving tests due to the way the website was designed. It uses [Puppeteer](https://github.com/puppeteer/puppeteer) to walk through the website and extract information as if it was a regular user (with some rate-limiting as to not overload the website with requests).

## Using the prebuilt binary

You can find a prebuilt binary in the Releases section with a list of the options below that you will need to pass (the ones that have a default are optional).

On the first run, the script will download a compatible version of Chrome/Chromium to retrieve the information but after that, it'll reuse the downloaded instance (unless I decide to use an updated revision in a future update).

```
$ .\drivetest-availabilities-win.exe -h
$ ./drivetest-availabilities-linux -h
$ ./drivetest-availabilities-macos -h

Usage: cli [options]

Options:
  -r, --radius <radius>            search radius in kilometers from where you are (default: 20)
  -l, --location <location>        your current location expressed in "latitude,longitude" (eg.
                                   43.6426445,-79.3871645).
  -m, --months <months>            Number of months to look ahead (default: 6)
  --licenseType <licenseType>      License type exam to search for
  --email <email>                  Email to log in with
  --licenseNumber <licenseNumber>  License number to log in with
  --licenseExpiry <licenseExpiry>  License expiry date expressed in "YYYY/MM/DD" to log in with
  --chromiumPath <chromiumPath>    Path to Chromium-based browser executable. If option not used, Chromium will be downloaded to this folder.
  -h, --help                       display help for command
```

## Building from source

### Prerequisites

* Node.js 14+ (active LTS at time of writing)
* [yarn classic](https://classic.yarnpkg.com/en/docs/install) (npm can be used but yarn is recommended since there's a yarn.lock file included)

### Steps

1. Install necessary dependencies by running `yarn install`
2. Compile the Typescript files to Javascript by running `yarn build`
3. Rename config.json.example to config.json, fill in all the empty fields and remove the comments from the file. However, if you want to pass the details manually as CLI arguments, you can leave the fields empty.
4. Start the script by running `yarn start` and passing in the required arguments (and any optional ones, if you wish)

### Creating your own executables

After following the steps above, if you wish to create your own executable off of this, just run `yarn package`.
