import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

/** Space kept between the focused field and the top of the keyboard. */
const GAP = 24;

/**
 * Keeps the focused text field visible above the keyboard inside a ScrollView.
 *
 * Works on Android with edge-to-edge (where the window does NOT shrink for the keyboard,
 * so KeyboardAvoidingView alone doesn't help) and on iOS:
 *  - adds bottom padding the size of the keyboard, so the content can scroll above it
 *  - when the keyboard opens or another field is focused, scrolls that field into view
 *
 * Usage: <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16}
 *          contentContainerStyle={{ paddingBottom: keyboardPadding }}>
 *        and pass onFocus to each TextInput / TextField.
 */
export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null); // screen Y of the keyboard's top edge
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  const ensureVisible = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const top = keyboardTop.current;
    if (!input || top == null) return;
    input.measureInWindow((_x, y, _w, h) => {
      const limit = top - GAP;
      if (y + h > limit) {
        // Field is hidden behind the keyboard: scroll down just enough.
        scrollRef.current?.scrollTo({ y: scrollY.current + (y + h - limit), animated: true });
      } else if (y < GAP * 3) {
        // Field went off the top: bring it back down a bit.
        scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current - (GAP * 3 - y)), animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardPadding(e.endCoordinates.height);
      // Wait for the padding to apply (and the iOS keyboard animation) before measuring.
      setTimeout(ensureVisible, ios ? 250 : 60);
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = null;
      setKeyboardPadding(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureVisible]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  /** Pass to each field's onFocus, so moving to the next field also scrolls it into view. */
  const onFocus = useCallback(() => {
    setTimeout(ensureVisible, 60);
  }, [ensureVisible]);

  return { scrollRef, onScroll, onFocus, keyboardPadding };
}
