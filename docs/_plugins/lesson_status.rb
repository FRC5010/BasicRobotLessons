# frozen_string_literal: true

# Marks the OpMode track's lessons that aren't up to date for the current 2027 alpha
# yet as "under construction". This happens on the website only: the lesson
# files don't change, so they read the same on GitHub.
#
# A lesson is under construction when its number is above the cut-off in
# tools/lib/v3-lessons.sh (V3_ALPHA7_THROUGH), so raising the cut-off clears
# its mark with no other edit. It's in the "unconverted" state unless
# _data/lesson_status.yml lists it under `waiting` with another state. Each
# marked lesson gets
#
#   - a banner under its title, saying which state it's in and why, and
#   - a pill under its name in the sidebar. The pills are CSS, written into
#     site.data["lesson_status_css"], which _includes/head_custom.html puts in
#     every page's <head>. The rules match links by their href, and the
#     theme's script removes the href from the link to the page you're on, so
#     the page also gets page.data["lesson_status"], which head_custom.html
#     uses to give that one link its pill.
#
# The track's own page gets a summary with the full legend, which the
# sidebar's short legend (_includes/nav_footer_custom.html) links to.
module LessonStatus
  TRACK_DIR = "lessons/v3"
  TRACK_PAGE = "lessons/v3/README.md"
  CUTOFF_FILE = File.join("..", "tools", "lib", "v3-lessons.sh")

  class Generator < Jekyll::Generator
    safe true
    # After jekyll-readme-index (priority :low) has turned the track's README
    # into its page.
    priority :lowest

    def generate(site)
      @site = site
      cutoff = read_cutoff
      return if cutoff.nil?

      config = site.data["lesson_status"] || {}
      @states = config["states"] || {}
      waiting = config["waiting"] || {}

      lessons = site.pages.filter_map do |page|
        number = page.path[%r!\A#{TRACK_DIR}/(\d+)-[^/]+\.md\z!, 1]
        [number.to_i, page] if number
      end.sort_by(&:first)

      marked = []
      lessons.each do |number, page|
        next if number <= cutoff

        entry = waiting[number] || waiting[number.to_s] || {}
        state = entry["state"] || "unconverted"
        unless @states.key?(state)
          Jekyll.logger.warn "LessonStatus:", "Lesson #{number} has unknown state '#{state}'"
          next
        end
        page.content = after_title(page.content, banner(state, entry["note"]))
        page.data["lesson_status"] = state
        marked << { number: number, url: page.url, state: state, note: entry["note"] }
      end

      site.data["lesson_status_css"] = sidebar_css(marked)

      track_page = site.pages.find { |page| page.path == TRACK_PAGE }
      if track_page
        numbers = lessons.map(&:first)
        track_page.content = after_title(track_page.content, summary(numbers, marked))
      end
    end

    private

    def read_cutoff
      path = File.expand_path(CUTOFF_FILE, @site.source)
      cutoff = File.exist?(path) && File.read(path)[/^V3_ALPHA7_THROUGH=(\d+)/, 1]
      unless cutoff
        Jekyll.logger.warn "LessonStatus:", "no V3_ALPHA7_THROUGH in #{path}; nothing marked"
        return nil
      end
      cutoff.to_i
    end

    # The legend lives on the track's page, under this anchor.
    def legend_url
      "#{@site.baseurl}/#{TRACK_DIR}/#lesson-status"
    end

    def pill(state)
      %(<span class="lesson-status-pill lesson-status-pill--#{state}">#{@states[state]["pill"]}</span>)
    end

    def banner(state, note)
      <<~HTML
        <div class="lesson-status lesson-status--#{state}" markdown="1">
        **Under construction: #{@states[state]["pill"]}.** #{@states[state]["meaning"]} #{note} [What the marks mean](#{legend_url})
        </div>
      HTML
    end

    def summary(numbers, marked)
      up_to_date = numbers.size - marked.size
      lines = @states.keys.filter_map do |state|
        in_state = marked.select { |m| m[:state] == state }
        next if in_state.empty?

        in_state_numbers = in_state.map { |m| m[:number] }
        which = if in_state_numbers.size == 1
                  "That's Lesson #{in_state_numbers.first}."
                else
                  "That's Lessons #{and_list(in_state_numbers)}."
                end
        notes = if in_state.size == 1
                  in_state.first[:note].to_s
                else
                  in_state.filter_map { |m| m[:note] && "Lesson #{m[:number]}: #{m[:note]}" }.join(" ")
                end
        "- #{pill(state)} #{@states[state]["meaning"]} #{which} #{notes}".rstrip
      end
      gaps = numbers.empty? ? [] : (0..numbers.max).to_a - numbers
      gap_line = case gaps.size
                 when 0 then ""
                 when 1 then "Lesson #{gaps.first} isn't written yet: it's the dash in the table below."
                 else "Lessons #{gaps.join(", ")} aren't written yet: they're the dashes in the table below."
                 end
      <<~HTML
        <div class="lesson-status lesson-status--summary" id="lesson-status" markdown="1">
        **Under construction.** #{up_to_date} of this track's #{numbers.size} lessons are up to date for the 2027 alpha-8. The other #{marked.size} carry one of these marks, under their names in the sidebar and at the top of the lesson:

        #{lines.join("\n")}

        #{gap_line}
        </div>
      HTML
    end

    # "23, 24 and 26".
    def and_list(items)
      items.size < 2 ? items.join : "#{items[0..-2].join(", ")} and #{items.last}"
    end

    # One rule per state: which sidebar links get a pill, and what it says.
    # The pill's look and colors are in _sass/custom/custom.scss.
    def sidebar_css(marked)
      marked.group_by { |m| m[:state] }.map do |state, members|
        selectors = members.map { |m| %(.site-nav .nav-list-link[href$="#{m[:url]}"]::after) }
        <<~CSS
          #{selectors.join(",\n")} {
            content: "#{@states[state]["pill"]}";
            background-color: var(--status-#{state});
            color: var(--status-#{state}-text);
          }
        CSS
      end.join
    end

    # Puts 'html' on its own after the page's first "# " heading, so the banner
    # sits under the lesson's title rather than above it.
    def after_title(content, html)
      title = content.match(/^# .*\n/)
      return "#{html}\n#{content}" unless title

      "#{title.pre_match}#{title[0]}\n#{html}\n#{title.post_match}"
    end
  end
end
