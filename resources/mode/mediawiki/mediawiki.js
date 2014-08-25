/*global CodeMirror, define, require  */
(function( mod ) {
	if ( typeof exports === 'object' && typeof module === 'object' ) { // CommonJS
		mod( require( '../../lib/codemirror' ), require( '../htmlmixed/htmlmixed' ) );
	} else if ( typeof define === 'function' && define.amd ) { // AMD
		define( ['../../lib/codemirror', '../htmlmixed/htmlmixed'], mod );
	} else { // Plain browser env
		mod( CodeMirror );
	}
})(function( CodeMirror ) {
'use strict';

CodeMirror.defineMode('mediawiki', function( /*config, parserConfig*/ ) {
	function inWikitext( stream, state ) {
		function chain( parser ) {
			state.tokenize = parser;
			return parser( stream, state );
		}

		var style = [];
		var sol = stream.sol();
		var blockType = null;
		if ( state.ImInBlock.length > 0 ) {
			blockType = state.ImInBlock[state.ImInBlock.length - 1];
		}

		switch ( blockType ) {
			case 'TemplatePageName':
				state.ImInBlock.pop();
				if ( stream.eat( '#' ) ) {
					state.ImInBlock.push( 'ParserFunctionName' );
					return 'keyword strong';
				} else {
					if ( stream.eatWhile( /[^<\{\&\s\}\|]/ ) ) {
						state.ImInBlock.push( 'TemplatePageNameContinue' );
						return 'link';
					}
				}
				break;
			case 'TemplatePageNameContinue':
				stream.eatSpace();
				if ( stream.match( /\s*[^<\{\&\s\}\|]/ ) ) {
					return 'link';
				}
				if ( stream.eat( '|' ) ) {
					state.ImInBlock.pop();
					state.ImInBlock.push( 'TemplateArgument' );
					stream.eatSpace();
					return 'tag strong';
				}
				if ( stream.match( /\}\}/ ) ) {
					state.ImInBlock.pop();
					return 'tag bracket';
				}
				break;
			case 'TemplateArgument':
				if ( stream.eatWhile( /[^=<\{\&\}\|]/ ) ) {
					if ( blockType === 'TemplateArgument' && stream.eat('=') ) {
						state.ImInBlock.pop();
						state.ImInBlock.push( 'TemplateArgumentContinue' );
						return 'string strong';
					}
					return 'string';
				} else if ( stream.eat( '|' ) ) {
					return 'tag strong';
				} else if ( stream.eat( '}' ) ) {
					if ( stream.eat( '}' ) ) {
						state.ImInBlock.pop();
						return 'tag bracket';
					}
				}
				break;
			case 'TemplateArgumentContinue':
				if ( stream.eatWhile( /[^<\{\&\}\|]/ ) ) {
					state.ImInBlock.pop();
					state.ImInBlock.push( 'TemplateArgument' );
					return 'string';
				} else if ( stream.eat( '|' ) ) {
					state.ImInBlock.pop();
					state.ImInBlock.push( 'TemplateArgument' );
					return 'tag strong';
				} else if ( stream.eat( '}' ) ) {
					if ( stream.eat( '}' ) ) {
						state.ImInBlock.pop();
						return 'tag bracket';
					}
				}
				break;
			case 'ParserFunctionName':
				if ( stream.eatWhile( /\w/ ) ) {
					return 'keyword strong';
				}
				if ( stream.eat( ':' ) ) {
					state.ImInBlock.pop();
					state.ImInBlock.push( 'ParserFunctionArgument' );
					return 'keyword strong';
				}
				break;
			case 'ParserFunctionArgument':
				if ( stream.eatWhile( /[^<\{\&\}\|]/ ) ) {
					return 'string-2';
				} else if ( stream.eat( '|' ) ) {
					return 'tag strong';
				} else if ( stream.eat( '}' ) ) {
					if ( stream.eat( '}' ) ) {
						state.ImInBlock.pop();
						return 'tag bracket';
					}
				}
				break;
			case null:
				if ( sol ) {
					state.isBold = false;
					state.isItalic = false;
//					if ( ch === ' ' ) {
//
//					}
				}
				if ( stream.peek() === '\'' ) {
					if ( stream.match( '\'\'\'' ) ) {
						state.isBold = state.isBold ? false : true;
						return null;
					} else if ( stream.match( '\'\'' ) ) {
						state.isItalic = state.isItalic ? false : true;
						return null;
					}
				}
				if ( state.isBold ) {
					style.push( 'strong' );
				}
				if ( state.isItalic ) {
					style.push( 'em' );
				}
		}

		var ch = stream.next();
		switch ( ch ) {
			case '{':
				if ( stream.eat( '{' ) ) { // Templates
					stream.eatSpace();
					state.ImInBlock.push( 'TemplatePageName' );
					return 'tag bracket';
				}
				break;
			case '<':
				if ( stream.match( '!--' ) ) {
					return chain( inBlock( 'comment', '-->' ) );
				}
				break;
			case '&':
				// this code was copied from mode/xml/xml.js
				var ok;
				if ( stream.eat( '#' ) ) {
					if (stream.eat( 'x' ) ) {
						ok = stream.eatWhile( /[a-fA-F\d]/ ) && stream.eat( ';');
					} else {
						ok = stream.eatWhile( /[\d]/ ) && stream.eat( ';' );
					}
				} else {
					ok = stream.eatWhile( /[\w\.\-:]/ ) && stream.eat( ';' );
				}
				if ( ok ) {
					return 'atom';
				}
				break;
		}
		stream.eatWhile( /[^<\{\&\n\']/ );

		if ( style.length > 0 ) {
			return style.join(' ');
		}
		return null;
	}

	function inBlock( style, terminator ) {
		return function( stream, state ) {
			while ( !stream.eol() ) {
				if ( stream.match( terminator ) ) {
					state.tokenize = inWikitext;
					break;
				}
				stream.next();
			}
			return style;
		};
	}

	return {
		startState: function() {
			return { tokenize: inWikitext, ImInBlock: [], isBold: false, isItalic: false };
		},
		token: function( stream, state ) {
			return state.tokenize( stream, state );
		}
	};
});

CodeMirror.defineMIME( 'text/mediawiki', 'mediawiki' );

});
