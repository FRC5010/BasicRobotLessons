package claims;

import java.io.IOException;
import java.lang.reflect.Method;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.jar.JarFile;

/** Reflection helpers for the claims tests: what a class or a whole package has, by name. */
final class Reflect {
  private Reflect() {}

  /** Every public method (inherited ones included) and declared method called name. */
  static List<String> methods(Class<?> c, String name) {
    return allMethods(c).stream().filter(m -> m.getName().equals(name)).map(Method::toString).distinct().toList();
  }

  static List<String> methodsStartingWith(Class<?> c, String prefix) {
    return allMethods(c).stream().filter(m -> m.getName().startsWith(prefix)).map(Method::toString).distinct().toList();
  }

  static boolean hasField(Class<?> c, String name) {
    return Arrays.stream(c.getFields()).anyMatch(f -> f.getName().equals(name))
        || Arrays.stream(c.getDeclaredFields()).anyMatch(f -> f.getName().equals(name));
  }

  private static List<Method> allMethods(Class<?> c) {
    var out = new ArrayList<Method>(Arrays.asList(c.getMethods()));
    out.addAll(Arrays.asList(c.getDeclaredMethods()));
    return out;
  }

  /**
   * Every class in the jar that holds the given class, in that class's package and the packages
   * under it, loaded without running their static initializers.
   */
  static List<Class<?>> packageClasses(Class<?> anchor) throws IOException, URISyntaxException {
    var prefix = anchor.getPackageName().replace('.', '/') + "/";
    var jar = new java.io.File(anchor.getProtectionDomain().getCodeSource().getLocation().toURI());
    var out = new ArrayList<Class<?>>();
    try (var file = new JarFile(jar)) {
      for (var e : file.stream().toList()) {
        var name = e.getName();
        if (name.startsWith(prefix) && name.endsWith(".class") && !name.contains("module-info")) {
          var cls = name.substring(0, name.length() - ".class".length()).replace('/', '.');
          try {
            out.add(Class.forName(cls, false, anchor.getClassLoader()));
          } catch (ClassNotFoundException | LinkageError err) {
            throw new AssertionError("couldn't load " + cls, err);
          }
        }
      }
    }
    return out;
  }
}
