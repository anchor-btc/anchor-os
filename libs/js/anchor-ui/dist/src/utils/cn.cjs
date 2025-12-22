'use strict';

var clsx = require('clsx');
var tailwindMerge = require('tailwind-merge');

// src/utils/cn.ts
function cn(...inputs) {
  return tailwindMerge.twMerge(clsx.clsx(inputs));
}

exports.cn = cn;
//# sourceMappingURL=cn.cjs.map
//# sourceMappingURL=cn.cjs.map