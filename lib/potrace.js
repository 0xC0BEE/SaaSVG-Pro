/**
 * potrace.js: a javascript port of potrace
 *
 * This is a browser-friendly ES module version, simplified and adapted for this application.
 * It has no Node.js dependencies and works directly with canvas ImageData.
 *
 * Original potrace: http://potrace.sourceforge.net
 * Javascript port by: http://kilobtye.com/
 */

var Potrace = (function() {

  function Point(x, y) {
    this.x = x;
    this.y = y;
  }

  Point.prototype.copy = function() {
    return new Point(this.x, this.y);
  };

  function Bitmap(w, h) {
    this.w = w;
    this.h = h;
    this.size = w * h;
    this.array = new Array(this.size);
    for (var i = 0; i < this.size; i++) {
      this.array[i] = 0;
    }
  }

  Bitmap.prototype.at = function(x, y) {
    return (x >= 0 && x < this.w && y >= 0 && y < this.h) &&
        this.array[x + y * this.w] === 1;
  };

  Bitmap.prototype.index = function(x, y) {
    return x + y * this.w;
  };

  Bitmap.prototype.flip = function(x, y) {
    if (this.at(x, y)) {
      this.array[this.index(x, y)] = 0;
    } else {
      this.array[this.index(x, y)] = 1;
    }
  };

  Bitmap.prototype.copy = function() {
    var bm = new Bitmap(this.w, this.h), i;
    for (i = 0; i < this.size; i++) {
      bm.array[i] = this.array[i];
    }
    return bm;
  };
  
  var Path = function() {
    this.area = 0;
    this.len = 0;
    this.curve = {};
    this.pt = [];
    this.minX = 100000;
    this.minY = 100000;
    this.maxX = -1;
    this.maxY = -1;
  }
  
  function Curve(n) {
    this.n = n;
    this.tag = new Array(n);
    this.c = new Array(n);
    // FIX: Properly initialize as a 2D array.
    for (var i = 0; i < n; i++) {
      this.c[i] = new Array(3);
    }
    this.alphaCurve = 0;
    this.vertex = new Array(n);
    this.alpha = new Array(n);
    this.alpha0 = new Array(n);
    this.beta = new Array(n);
  }

  function Potrace() {}

  Potrace.prototype.setParameters = function(params) {

    params = params || {};

    var turdSize = params.turdSize === undefined ? 2 : params.turdSize;
    this.turdsize = turdSize;

    var turnPolicy = params.turnPolicy === undefined ? "minority" : params.turnPolicy;
    if (turnPolicy === "black") {
      this.turnpolicy = 0;
    } else if (turnPolicy === "white") {
      this.turnpolicy = 1;
    } else if (turnPolicy === "left") {
      this.turnpolicy = 2;
    } else if (turnPolicy === "right") {
      this.turnpolicy = 3;
    } else if (turnPolicy === "minority") {
      this.turnpolicy = 4;
    } else if (turnPolicy === "majority") {
      this.turnpolicy = 5;
    } else {
      this.turnpolicy = 4;
    }

    var alphaMax = params.alphaMax === undefined ? 1 : params.alphaMax;
    this.alphamax = alphaMax;

    var optCurve = params.optCurve === undefined ? true : params.optCurve;
    this.opticurve = optCurve;

    var optTolerance = params.optTolerance === undefined ? 0.2 : params.optTolerance;
    this.opttolerance = optTolerance;

    var threshold = params.threshold === undefined ? -1 : params.threshold;
    this.threshold = threshold;

    var blackOnWhite = params.blackOnWhite === undefined ? true : params.blackOnWhite;
    this.blackOnWhite = blackOnWhite;
    
    var background = params.background === undefined ? 'transparent' : params.background;
    this.background = background;
    
    var color = params.color === undefined ? 'black' : params.color;
    this.color = color;
  };
  
  Potrace.prototype.loadImage = function(img) {
    var bm = new Bitmap(img.width, img.height);
    for (var i = 0; i < img.data.length; i += 4) {
      // Use a simple threshold for black/white based on luminance
      var luma = img.data[i] * 0.299 + img.data[i+1] * 0.587 + img.data[i+2] * 0.114;
      if (luma < 128) {
          bm.array[i/4] = 1;
      }
    }
    this.bm = bm;
  };
  
  Potrace.prototype.process = function(callback) {
    
    var bm = this.bm.copy();
    
    var pathlist = findPaths(bm);
    
    this.pathlist = processPaths(pathlist, this);

    callback();
  };
  
  Potrace.prototype.getSVG = function() {

    var fillStyle, strokeStyle,
        pathList = this.pathlist,
        path,
        w = this.bm.w,
        h = this.bm.h;

    var getTag = function(command, values) {
      var r = command;
      for (var i in values) {
        r += ' ' + values[i];
      }
      return r;
    };
    
    var getPath = function(p, color) {
      
      var res = [],
          n = p.curve.n,
          i,
          curve = p.curve;
      
      if (n === 0) return '';
      
      res.push(getTag('M', [curve.c[n-1][2].x, curve.c[n-1][2].y]));
      
      for (i=0; i<n; i++) {
        res.push(getTag('C', [curve.c[i][0].x, curve.c[i][0].y,
                              curve.c[i][1].x, curve.c[i][1].y,
                              curve.c[i][2].x, curve.c[i][2].y]));
      }
      
      var fill = color === 'transparent' ? 'none' : color;
      
      return `<path d="${res.join(' ')}" fill="${fill}" stroke="none"/>`;
      
    };

    var svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`;

    if (this.background !== 'transparent') {
      svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="${this.background}"/>`;
    }
    
    for (var i = 0; i < pathList.length; i++) {
      path = pathList[i];
      if (path.sign === '+') {
        svg += getPath(path, this.color);
      } else {
        svg += getPath(path, this.background);
      }
    }
    svg += '</svg>';
    
    return svg;
  };

  var bm_at = function(bm, x, y) {
    return (x >= 0 && x < bm.w && y >= 0 && y < bm.h) &&
        bm.array[x + y * bm.w] === 1;
  };

  var bm_flip = function(bm, x, y) {
    if (bm_at(bm, x, y)) {
      bm.array[x + y * bm.w] = 0;
    } else {
      bm.array[x + y * bm.w] = 1;
    }
  };

  function findNext(bm, p) {

    var i,
        x = p.x,
        y = p.y,
        N = 8,
        // d[i] is the direction from point i to point i+1, where
        // point 0 is the current point, and points 1-8 are the 8
        // neighbours, starting from the east and going anticlockwise.
        d = [[0,1,0,-1,1,1,-1,-1],
             [1,0,-1,0,1,-1,-1,1]];
    
    for (i = 0; i < N; i++) {
      if (bm_at(bm, x + d[0][i], y + d[1][i])) {
        return new Point(x + d[0][i], y + d[1][i]);
      }
    }

    return null;
  }
  
  function findPaths(bm) {

    var path,
        paths = [],
        p,
        w = bm.w,
        h = bm.h;
    
    function findStartPoint(bm) {
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          if (bm_at(bm, x, y)) {
            return new Point(x, y);
          }
        }
      }
      return null;
    }

    while (p = findStartPoint(bm)) {
      
      path = new Path();
      
      var startPoint = new Point(p.x, p.y),
          
          currentPoint = startPoint.copy(),
          
          lastPoint,
          
          nextPoint,
          
          dx,
          
          dy;
      
      while (true) {
        
        lastPoint = currentPoint.copy();
        
        path.pt.push(lastPoint);
        
        bm_flip(bm, lastPoint.x, lastPoint.y);
        
        nextPoint = findNext(bm, lastPoint);
        
        if (nextPoint === null) {
          
          break;
          
        }
        
        if (nextPoint.x === startPoint.x && nextPoint.y === startPoint.y) {
          
          break;
          
        }
        
        currentPoint = nextPoint;

      }

      paths.push(path);
      
    }
    
    return paths;

  }

  function processPaths(paths, params) {

    var path,
        i;
    
    var mod = function(a, n) {
      return a >= n ? a % n : a >= 0 ? a : n - 1 - (-1 - a) % n;
    };
    
    var xprod = function(p1, p2) {
      return p1.x * p2.y - p1.y * p2.x;
    };

    var cyclic = function(a, b, c) {
      if (a <= c) {
        return (a <= b && b < c);
      } else {
        return (a <= b || b < c);
      }
    };
    
    var sign = function(i) {
      if (i > 0) {
        return 1;
      } else if (i < 0) {
        return -1;
      } else {
        return 0;
      }
    };
    
    var quad = function(p0, p1) {
      var r = 0;
      if (p1.x > p0.x) r = 1;
      if (p1.y > p0.y) r = 2;
      return r;
    };

    // FIX: Replaced the broken curve-fitting logic with a robust implementation.
    // This new version correctly converts each line segment of the path outline
    // into a valid cubic Bézier curve, preventing crashes.
    function calcPath(path) {

      var n = path.pt.length,
          pt = path.pt,
          curve,
          i, j;

      path.curve = curve = new Curve(n); // Always create the curve object

      if (n === 0) {
        return;
      }

      // Calculate area and sign to determine if the path is a hole or a fill
      var sum = 0;
      for (i = 0; i < n; i++) {
        j = mod(i + 1, n);
        sum += xprod(pt[i], pt[j]);
      }
      path.area = -sum / 2;
      path.sign = sign(path.area);

      // If there's only one point, we can't form a curve, but initialize for safety.
      if (n < 2) {
          if (n === 1) {
            var p_one = pt[0];
            curve.c[0][0] = p_one.copy();
            curve.c[0][1] = p_one.copy();
            curve.c[0][2] = p_one.copy();
          }
          return;
      }
      
      // Convert each line segment of the path into a cubic bezier curve
      for (i = 0; i < n; i++) {
        var p0 = pt[i];
        var p3 = pt[mod(i + 1, n)];

        var qx = (p3.x - p0.x) / 3.0;
        var qy = (p3.y - p0.y) / 3.0;
        
        curve.c[i][0] = new Point(p0.x + qx, p0.y + qy);
        curve.c[i][1] = new Point(p0.x + 2 * qx, p0.y + 2 * qy);
        curve.c[i][2] = p3.copy();
      }
    }
    
    for (i = 0; i < paths.length; i++) {
      path = paths[i];
      calcPath(path);
    }
    
    return paths;

  }

  return Potrace;

})();

// Export a `trace` function that mimics the Node.js potrace API's callback style
// This makes it a drop-in replacement for the previous implementation.
function trace(imageData, params, callback) {
    try {
        const instance = new Potrace();
        instance.setParameters(params);
        instance.loadImage(imageData);
        instance.process(() => {
            const svg = instance.getSVG();
            callback(null, svg);
        });
    } catch (err) {
        callback(err, null);
    }
}

export { trace };
