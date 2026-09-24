package first.robot.subsystems;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.wpilib.math.geometry.Pose2d;

/**
 * Builds one results frame the way a Limelight writes it: MessagePack, a
 * compact binary cousin of JSON. Sim-only plumbing, holding just the few
 * keys the library needs to build a MegaTag2 pose estimate.
 */
public class LimelightFrame {
  private final ByteArrayOutputStream m_bytes = new ByteArrayOutputStream();

  /** A frame that saw nothing. Real cameras send these too — silence would mean "unplugged". */
  public static byte[] noTargets(long frameIndex, double latencyMs) {
    return new LimelightFrame()
        .map(3)
        .key("fidx").number(frameIndex)         // every frame is numbered, so no two are identical
        .key("v").number(0)                     // 0 = no valid target this frame
        .key("cl").number(latencyMs)            // capture latency, milliseconds
        .bytes();
  }

  /** A frame that saw 'tagIds' and placed the robot at 'robot' (MegaTag2, blue-alliance origin). */
  public static byte[] withTargets(long frameIndex, Pose2d robot, List<Integer> tagIds,
      double avgDistanceMeters, double latencyMs) {
    LimelightFrame frame = new LimelightFrame()
        .map(6)
        .key("fidx").number(frameIndex)
        .key("v").number(1)
        .key("cl").number(latencyMs)
        .key("botpose_orb_wpiblue").array(6)    // x, y, z (meters), roll, pitch, yaw (degrees)
            .number(robot.getX()).number(robot.getY()).number(0)
            .number(0).number(0).number(robot.getRotation().getDegrees())
        .key("botpose_avgdist").number(avgDistanceMeters)
        .key("Fiducial").array(tagIds.size());
    for (int id : tagIds) {
      frame.map(2)
          .key("fID").number(id)
          .key("fielded").number(1);            // 1 = this tag helped place the robot
    }
    return frame.bytes();
  }

  // The four MessagePack shapes those frames use. Each starts with one byte
  // saying what's coming, then the thing itself.

  private LimelightFrame map(int entries) {     // up to 15 key/value pairs
    m_bytes.write(0x80 | entries);
    return this;
  }

  private LimelightFrame array(int items) {     // up to 15 items
    m_bytes.write(0x90 | items);
    return this;
  }

  private LimelightFrame key(String text) {     // strings up to 31 bytes
    byte[] utf8 = text.getBytes(StandardCharsets.UTF_8);
    m_bytes.write(0xA0 | utf8.length);
    m_bytes.writeBytes(utf8);
    return this;
  }

  private LimelightFrame number(double value) { // every number as a 64-bit double
    m_bytes.write(0xCB);
    m_bytes.writeBytes(ByteBuffer.allocate(8).putDouble(value).array());
    return this;
  }

  private byte[] bytes() {
    return m_bytes.toByteArray();
  }
}
