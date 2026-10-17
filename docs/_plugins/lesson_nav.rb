# frozen_string_literal: true

# Puts every lesson in the website's sidebar without adding front matter to the
# lesson files, so they stay plain Markdown that reads the same on GitHub.
#
# Just the Docs builds its sidebar from three page settings: `title` (the
# label), `parent` (the title of the page to sit under) and `nav_order`. This
# sets them from what the files already have:
#
#   index.md             -> "Home", first
#   lessons/README.md    -> "Classic track", second, with its folder's pages under it
#   lessons/v3/README.md -> "OpMode track", third, with its folder's pages under it
#
# A lesson's label is its number plus its heading up to the colon, so
# "# Lesson 18 — Scoring elevator: a second mechanism" shows as
# "18 · Scoring elevator". (Not "18. Scoring elevator": the theme runs the title
# through Markdown for the browser tab, where that's a numbered list and the 18
# disappears.) It's ordered by the number in its file name, because the theme on
# its own sorts labels as text (1, 10, 11, 2 …). The setup aside shows as "Setup"
# above Lesson 0; the other asides come after the lessons, sorted by label.
#
# A value a page sets in its own front matter wins over all of this.
module LessonNav
  TRACKS = {
    "lessons/README.md" => { "title" => "Classic track", "nav_order" => 2 },
    "lessons/v3/README.md" => { "title" => "OpMode track", "nav_order" => 3 },
  }.freeze

  HOME = { "title" => "Home", "nav_order" => 1 }.freeze

  class Generator < Jekyll::Generator
    safe true
    # Runs after jekyll-readme-index (priority :low) has turned each README.md
    # into its folder's page.
    priority :lowest

    def generate(site)
      site.pages.each do |page|
        next unless page.path.end_with?(".md")

        settings = settings_for(page)
        settings&.each { |key, value| page.data[key] = value if page.data[key].nil? }
      end
    end

    private

    def settings_for(page)
      return HOME if page.path == "index.md"
      return TRACKS[page.path] if TRACKS.key?(page.path)

      track = TRACKS[File.join(File.dirname(page.path), "README.md")]
      return nil unless track

      heading = page.content[/^# (.+)$/, 1]
      if heading.nil?
        Jekyll.logger.warn "LessonNav:", "#{page.path} has no '# ' heading, so it's left out of the sidebar"
        return nil
      end

      label = heading.delete("`").split(":").first.strip
      name = File.basename(page.path, ".md")
      settings = { "parent" => track["title"] }

      if (number = name[/\A(\d+)-/, 1])
        settings["title"] = "#{number.to_i} · #{label.sub(/\ALesson \d+ — /, "")}"
        settings["nav_order"] = number.to_i
      elsif name == "aside-setup"
        settings["title"] = "Setup"
        settings["nav_order"] = -1
      else
        settings["title"] = label.sub(/\AAside — /, "Aside · ")
      end
      settings
    end
  end
end
