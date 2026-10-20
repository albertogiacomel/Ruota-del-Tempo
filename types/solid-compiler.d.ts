declare module '@solidjs/babel-plugin' {
  import type { PluginItem } from '@babel/core';
  const compiler: PluginItem;
  export default compiler;
}
