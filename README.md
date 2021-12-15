# Nagare
*ながれ • nagaɾe – english meaning: flow | stream | current*



### What is it?
Nagare is a library that helps implement "stale while revalidate" or SWR. Contrary to other solutions, this library is not bound to a single front-end framework like React, Vue or Angular. The library is built on top of RxJs and localForage which makes it very versatile and should allow it to be bloat free.

### Examples
```ts
import { QueryClient } from 'nagare.js';

const queryClient = new QueryClient()
```