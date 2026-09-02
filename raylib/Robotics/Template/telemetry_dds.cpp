/**
 * telemetry_dds.cpp - eProsima Fast DDS implementation of telemetry::Sink.
 *
 * PURPOSE:
 * Creates one DomainParticipant, one Publisher and three DataWriters, and
 * converts the plain structs from telemetry.hpp into the generated IDL types.
 *
 * TOPICS AND QoS:
 *   FlowFieldSnapshot   RELIABLE  + TRANSIENT_LOCAL, KEEP_LAST(1)
 *                       The grid changes only on re-seed, and a plotter that
 *                       starts late still needs it, so it is latched.
 *   FlowVehicleSample   BEST_EFFORT + VOLATILE, KEEP_LAST(32)
 *   FlowFrameStats      BEST_EFFORT + VOLATILE, KEEP_LAST(32)
 *                       Streaming telemetry: dropping a sample is cheaper than
 *                       letting a reliable writer block the 60 fps render loop.
 *
 * VERSION PORTABILITY:
 * Only the subset of the DDS API that is identical across Fast DDS 2.x and 3.x
 * is used. The generated header is .h in the 2.x generator and .hpp in the 3.x
 * one, hence the __has_include dance below. ReturnCode_t is never compared
 * against a named constant (it moved namespace in 3.0); failures are detected
 * from the null entity pointers instead.
 */

#include "telemetry.hpp"

#include <fastdds/dds/core/policy/QosPolicies.hpp>
#include <fastdds/dds/domain/DomainParticipant.hpp>
#include <fastdds/dds/domain/DomainParticipantFactory.hpp>
#include <fastdds/dds/domain/qos/DomainParticipantQos.hpp>
#include <fastdds/dds/publisher/DataWriter.hpp>
#include <fastdds/dds/publisher/Publisher.hpp>
#include <fastdds/dds/publisher/qos/DataWriterQos.hpp>
#include <fastdds/dds/topic/Topic.hpp>
#include <fastdds/dds/topic/TypeSupport.hpp>

#if defined(__has_include)
#  if __has_include("FlowTelemetryPubSubTypes.hpp")
#    include "FlowTelemetryPubSubTypes.hpp"   // fastddsgen 3.x / 4.x
#  else
#    include "FlowTelemetryPubSubTypes.h"     // fastddsgen 2.x
#  endif
#else
#  include "FlowTelemetryPubSubTypes.h"
#endif

#include <cstdio>

using namespace eprosima::fastdds::dds;

namespace {

flowfield::Vec2f ToIdl(const telemetry::Vec2f& v) {
    flowfield::Vec2f out;
    out.x(v.x);
    out.y(v.y);
    return out;
}

class DdsSink final : public telemetry::Sink {
public:
    ~DdsSink() override { close(); }

    bool open(unsigned int domainId) override {
        auto factory = DomainParticipantFactory::get_instance();

        DomainParticipantQos participantQos = PARTICIPANT_QOS_DEFAULT;
        participantQos.name() = "FlowFieldSim";

        participant_ = factory->create_participant(domainId, participantQos);
        if (participant_ == nullptr) {
            std::fprintf(stderr, "[dds] could not create participant on domain %u\n", domainId);
            return false;
        }

        publisher_ = participant_->create_publisher(PUBLISHER_QOS_DEFAULT);
        if (publisher_ == nullptr) {
            std::fprintf(stderr, "[dds] could not create publisher\n");
            return false;
        }

        const bool ok =
            makeWriter<flowfield::FieldSnapshotPubSubType>(
                "FlowFieldSnapshot", fieldType_, fieldTopic_, fieldWriter_,
                RELIABLE_RELIABILITY_QOS, TRANSIENT_LOCAL_DURABILITY_QOS, 1) &&
            makeWriter<flowfield::VehicleSamplePubSubType>(
                "FlowVehicleSample", vehicleType_, vehicleTopic_, vehicleWriter_,
                BEST_EFFORT_RELIABILITY_QOS, VOLATILE_DURABILITY_QOS, 32) &&
            makeWriter<flowfield::FrameStatsPubSubType>(
                "FlowFrameStats", statsType_, statsTopic_, statsWriter_,
                BEST_EFFORT_RELIABILITY_QOS, VOLATILE_DURABILITY_QOS, 32);

        if (!ok) {
            close();
            return false;
        }

        std::printf("[dds] publishing on domain %u as \"%s\", \"%s\", \"%s\"\n",
                    domainId, "FlowFieldSnapshot", "FlowVehicleSample", "FlowFrameStats");
        ready_ = true;
        return true;
    }

    void close() override {
        ready_ = false;
        if (participant_ != nullptr) {
            participant_->delete_contained_entities();
            DomainParticipantFactory::get_instance()->delete_participant(participant_);
            participant_ = nullptr;
        }
        publisher_ = nullptr;
        fieldTopic_ = vehicleTopic_ = statsTopic_ = nullptr;
        fieldWriter_ = vehicleWriter_ = statsWriter_ = nullptr;
    }

    void publish(const telemetry::FieldSnapshot& snapshot) override {
        if (!ready_) return;

        flowfield::FieldSnapshot sample;
        sample.field_id(snapshot.field_id);
        sample.seed(snapshot.seed);
        sample.rows(snapshot.rows);
        sample.cols(snapshot.cols);
        sample.resolution(snapshot.resolution);

        std::vector<flowfield::Vec2f> vectors;
        vectors.reserve(snapshot.vectors.size());
        for (const telemetry::Vec2f& v : snapshot.vectors) {
            vectors.push_back(ToIdl(v));
        }
        sample.vectors(vectors);

        fieldWriter_->write(&sample);
    }

    void publish(const telemetry::VehicleSample& in) override {
        if (!ready_) return;

        flowfield::VehicleSample sample;
        sample.vehicle_id(in.vehicle_id);
        sample.frame(in.frame);
        sample.stamp(in.stamp);
        sample.position(ToIdl(in.position));
        sample.velocity(ToIdl(in.velocity));
        sample.desired(ToIdl(in.desired));
        sample.steer(ToIdl(in.steer));
        sample.speed(in.speed);
        sample.heading(in.heading);
        sample.alignment(in.alignment);

        vehicleWriter_->write(&sample);
    }

    void publish(const telemetry::FrameStats& in) override {
        if (!ready_) return;

        flowfield::FrameStats sample;
        sample.field_id(in.field_id);
        sample.frame(in.frame);
        sample.stamp(in.stamp);
        sample.fps(in.fps);
        sample.mean_speed(in.mean_speed);
        sample.mean_alignment(in.mean_alignment);
        sample.vehicle_count(in.vehicle_count);

        statsWriter_->write(&sample);
    }

    bool ready() const override { return ready_; }
    const char* backend() const override { return "Fast DDS"; }

private:
    /** Register the type, create the topic, create a writer with explicit QoS. */
    template <typename PubSubType>
    bool makeWriter(const char* topicName,
                    TypeSupport& type,
                    Topic*& topic,
                    DataWriter*& writer,
                    ReliabilityQosPolicyKind reliability,
                    DurabilityQosPolicyKind durability,
                    std::int32_t depth) {
        type = TypeSupport(new PubSubType());
        type.register_type(participant_);

        topic = participant_->create_topic(topicName, type.get_type_name(), TOPIC_QOS_DEFAULT);
        if (topic == nullptr) {
            std::fprintf(stderr, "[dds] could not create topic \"%s\"\n", topicName);
            return false;
        }

        DataWriterQos writerQos = DATAWRITER_QOS_DEFAULT;
        writerQos.reliability().kind = reliability;
        writerQos.durability().kind = durability;
        writerQos.history().kind = KEEP_LAST_HISTORY_QOS;
        writerQos.history().depth = depth;

        writer = publisher_->create_datawriter(topic, writerQos);
        if (writer == nullptr) {
            std::fprintf(stderr, "[dds] could not create writer for \"%s\"\n", topicName);
            return false;
        }
        return true;
    }

    DomainParticipant* participant_ = nullptr;
    Publisher* publisher_ = nullptr;

    TypeSupport fieldType_;
    TypeSupport vehicleType_;
    TypeSupport statsType_;

    Topic* fieldTopic_ = nullptr;
    Topic* vehicleTopic_ = nullptr;
    Topic* statsTopic_ = nullptr;

    DataWriter* fieldWriter_ = nullptr;
    DataWriter* vehicleWriter_ = nullptr;
    DataWriter* statsWriter_ = nullptr;

    bool ready_ = false;
};

}  // namespace

std::unique_ptr<telemetry::Sink> telemetry::CreateSink() {
    return std::unique_ptr<telemetry::Sink>(new DdsSink());
}
